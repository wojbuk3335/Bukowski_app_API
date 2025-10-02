const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

describe('Bags Functionality Simple Tests', () => {
    let mongoServer;
    let Goods, Warehouse, State, User, Size, Category, BagsCategory;

    beforeAll(async () => {
        // Clear mongoose cache safely
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        
        // Clear models if they exist
        if (mongoose.models) {
            Object.keys(mongoose.models).forEach(key => delete mongoose.models[key]);
        }
        if (mongoose.modelSchemas) {
            Object.keys(mongoose.modelSchemas).forEach(key => delete mongoose.modelSchemas[key]);
        }

        // Setup in-memory MongoDB
        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();
        await mongoose.connect(uri);

        // Import models after clearing cache
        Goods = require('../app/db/models/goods');
        Warehouse = require('../app/db/models/warehouse');  
        State = require('../app/db/models/state');
        User = require('../app/db/models/user');
        Size = require('../app/db/models/size');
        Category = require('../app/db/models/category');
        BagsCategory = require('../app/db/models/bagsCategory');
    }, 15000); // Increase timeout

    afterAll(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        await mongoServer.stop();
    }, 15000); // Increase timeout

    beforeEach(async () => {
        // Clear all collections
        await Goods.deleteMany({});
        await Warehouse.deleteMany({});
        await State.deleteMany({});
        await User.deleteMany({});
        await Size.deleteMany({});
        await Category.deleteMany({});
        await BagsCategory.deleteMany({});
    });

    describe('1. Test dobierania torebek do magazynu', () => {
        it('Powinien utworzyć torebkę z rozmiarem TOREBKA', async () => {
            // Przygotuj dane testowe
            const category = new Category({
                name: 'Torebki',
                isActive: true
            });
            await category.save();

            const bagsCategory = new BagsCategory({
                name: 'Damskie torebki',
                gender: 'K',
                isActive: true
            });
            await bagsCategory.save();

            const specialBagSize = new Size({
                name: 'TOREBKA',
                Roz_Kod: '00',
                isActive: true
            });
            await specialBagSize.save();

            const testGoods = new Goods({
                code: '0002310000008',
                name: 'Test Torebka',
                fullName: 'Test Torebka Damska',
                category: 'Torebki',
                bagsCategoryId: bagsCategory._id,
                color: 'Czarna',
                gender: 'K',
                isActive: true
            });
            await testGoods.save();

            // Test - dodaj torebkę do magazynu
            const warehouseItem = new Warehouse({
                code: testGoods.code,
                fullName: testGoods.fullName,
                goods: testGoods._id,
                size: specialBagSize._id,
                quantity: 1,
                isActive: true
            });
            await warehouseItem.save();

            // Sprawdzenia
            const savedItem = await Warehouse.findOne({ goods: testGoods._id }).populate('size');
            expect(savedItem).toBeTruthy();
            expect(savedItem.code).toBe('0002310000008'); // Oryginalny kod zachowany
            expect(savedItem.size.name).toBe('TOREBKA'); // Specjalny rozmiar dla torebek
            expect(savedItem.size.Roz_Kod).toBe('00');

            console.log('✅ Test 1: Torebka dodana do magazynu z rozmiarem TOREBKA i oryginalnym kodem');
        });
    });

    describe('2. Test transferu torebek z magazynu do użytkownika', () => {
        it('Powinien przenieść torebkę z magazynu do stanu bez rozmiaru', async () => {
            // Przygotuj dane testowe
            const testUser = new User({
                name: 'TestUser',
                symbol: 'TU',
                isActive: true
            });
            await testUser.save();

            const specialBagSize = new Size({
                name: 'TOREBKA',
                Roz_Kod: '00',
                isActive: true
            });
            await specialBagSize.save();

            const testGoods = new Goods({
                code: '0002310000008',
                name: 'Test Torebka',
                fullName: 'Test Torebka Damska',
                category: 'Torebki',
                isActive: true
            });
            await testGoods.save();

            // Najpierw dodaj do magazynu
            const warehouseItem = new Warehouse({
                code: testGoods.code,
                fullName: testGoods.fullName,
                goods: testGoods._id,
                size: specialBagSize._id,
                quantity: 1,
                isActive: true
            });
            await warehouseItem.save();

            // Test transferu - przenieś do stanu użytkownika
            const transferCode = `INCOMING_${Date.now()}_test`;
            const stateItem = new State({
                code: transferCode,
                fullName: testGoods.fullName,
                goods: testGoods._id,
                user: testUser._id,
                size: null, // Torebki w stanie nie mają rozmiaru
                quantity: 1,
                isActive: true
            });
            await stateItem.save();

            // Oznacz warehouse jako przetworzone
            warehouseItem.processed = true;
            await warehouseItem.save();

            // Sprawdzenia
            const savedStateItem = await State.findOne({ goods: testGoods._id, user: testUser._id });
            expect(savedStateItem).toBeTruthy();
            expect(savedStateItem.size).toBeNull(); // Brak rozmiaru w stanie
            expect(savedStateItem.code).toMatch(/^INCOMING_\d+_test$/); // Wygenerowany kod transferu

            const processedWarehouse = await Warehouse.findById(warehouseItem._id);
            expect(processedWarehouse.processed).toBe(true);

            console.log('✅ Test 2: Torebka przeniesiona z magazynu do stanu bez rozmiaru');
        });
    });

    describe('3. Test odpisywania torebek ze stanu', () => {
        it('Powinien odpisać torebkę ze stanu (sprzedaż)', async () => {
            // Przygotuj dane testowe
            const testUser = new User({
                name: 'TestUser',
                symbol: 'TU',
                isActive: true
            });
            await testUser.save();

            const testGoods = new Goods({
                code: '0002310000008',
                name: 'Test Torebka',
                fullName: 'Test Torebka Damska',
                category: 'Torebki',
                isActive: true
            });
            await testGoods.save();

            // Dodaj torebkę do stanu użytkownika
            const stateItem = new State({
                code: `INCOMING_${Date.now()}_test`,
                fullName: testGoods.fullName,
                goods: testGoods._id,
                user: testUser._id,
                size: null,
                quantity: 1,
                isActive: true
            });
            await stateItem.save();

            // Test odpisania - oznacz jako sprzedaną
            stateItem.processed = true;
            stateItem.transferType = 'sale';
            await stateItem.save();

            // Sprawdzenia
            const processedItem = await State.findById(stateItem._id);
            expect(processedItem.processed).toBe(true);
            expect(processedItem.transferType).toBe('sale');

            console.log('✅ Test 3: Torebka odpisana ze stanu (sprzedaż)');
        });

        it('Powinien zwrócić torebkę do magazynu', async () => {
            // Przygotuj dane testowe
            const testUser = new User({
                name: 'TestUser',
                symbol: 'TU',
                isActive: true
            });
            await testUser.save();

            const specialBagSize = new Size({
                name: 'TOREBKA',
                Roz_Kod: '00',
                isActive: true
            });
            await specialBagSize.save();

            const testGoods = new Goods({
                code: '0002310000008',
                name: 'Test Torebka',
                fullName: 'Test Torebka Damska',
                category: 'Torebki',
                isActive: true
            });
            await testGoods.save();

            // Dodaj torebkę do stanu użytkownika
            const stateItem = new State({
                code: `INCOMING_${Date.now()}_test`,
                fullName: testGoods.fullName,
                goods: testGoods._id,
                user: testUser._id,
                size: null,
                quantity: 1,
                isActive: true
            });
            await stateItem.save();

            // Test zwrócenia - przenieś z powrotem do magazynu
            const returnedWarehouseItem = new Warehouse({
                code: testGoods.code, // Oryginalny kod
                fullName: testGoods.fullName,
                goods: testGoods._id,
                size: specialBagSize._id, // Z powrotem z rozmiarem TOREBKA
                quantity: 1,
                isActive: true
            });
            await returnedWarehouseItem.save();

            // Oznacz stan jako przetworzone
            stateItem.processed = true;
            stateItem.transferType = 'return';
            await stateItem.save();

            // Sprawdzenia
            const returnedItem = await Warehouse.findOne({ goods: testGoods._id }).populate('size');
            expect(returnedItem).toBeTruthy();
            expect(returnedItem.code).toBe('0002310000008'); // Oryginalny kod przywrócony
            expect(returnedItem.size.name).toBe('TOREBKA'); // Rozmiar przywrócony

            const processedState = await State.findById(stateItem._id);
            expect(processedState.processed).toBe(true);
            expect(processedState.transferType).toBe('return');

            console.log('✅ Test 3b: Torebka zwrócona do magazynu z oryginalnym kodem');
        });
    });

    describe('4. Test pełnego cyklu torebki', () => {
        it('Powinien obsłużyć: magazyn → użytkownik → sprzedaż', async () => {
            // Przygotuj dane testowe
            const testUser = new User({
                name: 'TestUser',
                symbol: 'TU',
                isActive: true
            });
            await testUser.save();

            const specialBagSize = new Size({
                name: 'TOREBKA',
                Roz_Kod: '00',
                isActive: true
            });
            await specialBagSize.save();

            const testGoods = new Goods({
                code: '0002310000008',
                name: 'Test Torebka',
                fullName: 'Test Torebka Damska',
                category: 'Torebki',
                isActive: true
            });
            await testGoods.save();

            // Krok 1: Dodaj do magazynu
            const warehouseItem = new Warehouse({
                code: testGoods.code,
                fullName: testGoods.fullName,
                goods: testGoods._id,
                size: specialBagSize._id,
                quantity: 1,
                isActive: true
            });
            await warehouseItem.save();

            // Krok 2: Transfer do użytkownika
            const stateItem = new State({
                code: `INCOMING_${Date.now()}_test`,
                fullName: testGoods.fullName,
                goods: testGoods._id,
                user: testUser._id,
                size: null, // Brak rozmiaru w stanie
                quantity: 1,
                isActive: true
            });
            await stateItem.save();

            warehouseItem.processed = true;
            await warehouseItem.save();

            // Krok 3: Sprzedaż
            stateItem.processed = true;
            stateItem.transferType = 'sale';
            await stateItem.save();

            // Sprawdzenia końcowego stanu
            const finalWarehouse = await Warehouse.findById(warehouseItem._id);
            expect(finalWarehouse.processed).toBe(true);

            const finalState = await State.findById(stateItem._id);
            expect(finalState.processed).toBe(true);
            expect(finalState.transferType).toBe('sale');

            console.log('✅ Test 4: Pełny cykl torebki: magazyn → użytkownik → sprzedaż');
        });
    });
});