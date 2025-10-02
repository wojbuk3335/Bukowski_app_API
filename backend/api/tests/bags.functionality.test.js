const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Create a minimal Express app for testing
const express = require('express');
const app = express();
app.use(express.json({ limit: '50mb' }));

describe('Bags Functionality Tests', () => {
    let mongoServer;
    let testUser;
    let bagsCategory;
    let testGoods;
    let specialBagSize;
    let Goods, Warehouse, State, User, Size, Category, BagsCategory;
    let warehouseController, transferProcessingController;

    beforeAll(async () => {
        // Clear mongoose models cache
        if (mongoose.models) {
            Object.keys(mongoose.models).forEach(model => {
                delete mongoose.models[model];
            });
        }
        if (mongoose.modelSchemas) {
            Object.keys(mongoose.modelSchemas).forEach(model => {
                delete mongoose.modelSchemas[model];
            });
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

        // Import controllers
        warehouseController = require('../app/controllers/warehouse');
        transferProcessingController = require('../app/controllers/transferProcessing');

        // Setup routes
        app.post('/api/warehouse', warehouseController.addToWarehouse);
        app.post('/api/transfer-processing', transferProcessingController.processTransfers);
    });

    afterAll(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        // Wyczyść bazy danych
        await Goods.deleteMany({});
        await Warehouse.deleteMany({});
        await State.deleteMany({});
        await User.deleteMany({});
        await Size.deleteMany({});
        await Category.deleteMany({});
        await BagsCategory.deleteMany({});

        // Utwórz użytkownika testowego
        testUser = new User({
            name: 'TestUser',
            symbol: 'TU',
            isActive: true
        });
        await testUser.save();

        // Utwórz kategorię Torebki
        const category = new Category({
            name: 'Torebki',
            isActive: true
        });
        await category.save();

        // Utwórz kategorię torebek
        bagsCategory = new BagsCategory({
            name: 'Damskie torebki',
            gender: 'K',
            isActive: true
        });
        await bagsCategory.save();

        // Utwórz specjalny rozmiar TOREBKA
        specialBagSize = new Size({
            name: 'TOREBKA',
            Roz_Kod: '00',
            isActive: true
        });
        await specialBagSize.save();

        // Utwórz torebkę w towarach
        testGoods = new Goods({
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
    });

    afterEach(async () => {
        // Wyczyść bazy danych po testach
        await Goods.deleteMany({});
        await Warehouse.deleteMany({});
        await State.deleteMany({});
        await User.deleteMany({});
        await Size.deleteMany({});
        await Category.deleteMany({});
        await BagsCategory.deleteMany({});
    });

    describe('1. Dobieranie torebek do magazynu', () => {
        it('Powinien dodać torebkę do magazynu z rozmiarem "-" (TOREBKA)', async () => {
            const response = await request(app)
                .post('/api/warehouse')
                .send({
                    code: testGoods.code,
                    goodsId: testGoods._id,
                    selectedSize: specialBagSize._id, // Automatycznie przypisany rozmiar TOREBKA
                    quantity: 1
                });

            expect(response.status).toBe(201);
            expect(response.body.message).toContain('dodany do magazynu');

            // Sprawdź czy torebka została dodana do magazynu
            const warehouseItem = await Warehouse.findOne({ goods: testGoods._id });
            expect(warehouseItem).toBeTruthy();
            expect(warehouseItem.size.toString()).toBe(specialBagSize._id.toString());

            console.log('✅ Test 1: Torebka dodana do magazynu z rozmiarem TOREBKA');
        });

        it('Powinien zachować oryginalny kod kreskowy torebki', async () => {
            const response = await request(app)
                .post('/api/warehouse')
                .send({
                    code: testGoods.code,
                    goodsId: testGoods._id,
                    selectedSize: specialBagSize._id,
                    quantity: 1
                });

            expect(response.status).toBe(201);

            const warehouseItem = await Warehouse.findOne({ goods: testGoods._id });
            expect(warehouseItem.code).toBe(testGoods.code); // Oryginalny kod zachowany

            console.log('✅ Test 1b: Kod kreskowy torebki zachowany:', warehouseItem.code);
        });
    });

    describe('2. Transfer torebek z magazynu do użytkownika', () => {
        beforeEach(async () => {
            // Dodaj torebkę do magazynu przed każdym testem transferu
            const warehouseItem = new Warehouse({
                code: testGoods.code,
                fullName: testGoods.fullName,
                goods: testGoods._id,
                size: specialBagSize._id,
                quantity: 1,
                isActive: true
            });
            await warehouseItem.save();
        });

        it('Powinien przenieść torebkę z magazynu do stanu użytkownika', async () => {
            const response = await request(app)
                .post('/api/transfer-processing')
                .send({
                    warehouseItems: [
                        {
                            _id: (await Warehouse.findOne({ goods: testGoods._id }))._id,
                            transfer_to: testUser.symbol,
                            isIncomingTransfer: true
                        }
                    ]
                });

            expect(response.status).toBe(200);
            expect(response.body.addedItems).toHaveLength(1);

            // Sprawdź czy torebka jest w stanie użytkownika
            const stateItem = await State.findOne({ 
                goods: testGoods._id, 
                user: testUser._id 
            });
            expect(stateItem).toBeTruthy();
            expect(stateItem.size).toBe(null); // Torebki nie mają rozmiaru w stanie

            // Sprawdź czy item został usunięty z magazynu (processed = true)
            const warehouseItem = await Warehouse.findOne({ goods: testGoods._id });
            expect(warehouseItem.processed).toBe(true);

            console.log('✅ Test 2: Torebka przeniesiona z magazynu do stanu użytkownika');
        });

        it('Powinien wygenerować unikalny kod dla torebki w transferze', async () => {
            const response = await request(app)
                .post('/api/transfer-processing')
                .send({
                    warehouseItems: [
                        {
                            _id: (await Warehouse.findOne({ goods: testGoods._id }))._id,
                            transfer_to: testUser.symbol,
                            isIncomingTransfer: true
                        }
                    ]
                });

            expect(response.status).toBe(200);

            const stateItem = await State.findOne({ 
                goods: testGoods._id, 
                user: testUser._id 
            });
            
            // Kod powinien zaczynać się od INCOMING_ dla transferów przychodzących
            expect(stateItem.code).toMatch(/^INCOMING_\d+_[a-z0-9]+$/);

            console.log('✅ Test 2b: Wygenerowany kod transferu:', stateItem.code);
        });
    });

    describe('3. Odpisywanie torebek ze stanu użytkownika', () => {
        beforeEach(async () => {
            // Dodaj torebkę do stanu użytkownika przed każdym testem odpisywania
            const stateItem = new State({
                code: `INCOMING_${Date.now()}_test`,
                fullName: testGoods.fullName,
                goods: testGoods._id,
                user: testUser._id,
                size: null, // Torebki nie mają rozmiaru w stanie
                quantity: 1,
                isActive: true
            });
            await stateItem.save();
        });

        it('Powinien odpisać torebkę ze stanu użytkownika (sprzedaż)', async () => {
            const stateItem = await State.findOne({ 
                goods: testGoods._id, 
                user: testUser._id 
            });

            const response = await request(app)
                .post('/api/transfer-processing')
                .send({
                    stateItems: [
                        {
                            _id: stateItem._id,
                            isOutgoingTransfer: true,
                            transferType: 'sale'
                        }
                    ]
                });

            expect(response.status).toBe(200);
            expect(response.body.processedItems).toHaveLength(1);

            // Sprawdź czy torebka została oznaczona jako przetworzona
            const updatedStateItem = await State.findById(stateItem._id);
            expect(updatedStateItem.processed).toBe(true);

            console.log('✅ Test 3: Torebka odpisana ze stanu (sprzedaż)');
        });

        it('Powinien obsłużyć korektę torebki (odpisanie z powodu błędu)', async () => {
            const stateItem = await State.findOne({ 
                goods: testGoods._id, 
                user: testUser._id 
            });

            const response = await request(app)
                .post('/api/transfer-processing')
                .send({
                    stateItems: [
                        {
                            _id: stateItem._id,
                            isOutgoingTransfer: true,
                            transferType: 'correction'
                        }
                    ]
                });

            expect(response.status).toBe(200);
            expect(response.body.processedItems).toHaveLength(1);

            const updatedStateItem = await State.findById(stateItem._id);
            expect(updatedStateItem.processed).toBe(true);

            console.log('✅ Test 3b: Torebka odpisana przez korektę');
        });

        it('Powinien zwrócić torebkę do magazynu (transfer wychodzący)', async () => {
            const stateItem = await State.findOne({ 
                goods: testGoods._id, 
                user: testUser._id 
            });

            const response = await request(app)
                .post('/api/transfer-processing')
                .send({
                    stateItems: [
                        {
                            _id: stateItem._id,
                            isOutgoingTransfer: true,
                            transferType: 'return',
                            transfer_to: 'WAREHOUSE'
                        }
                    ]
                });

            expect(response.status).toBe(200);
            expect(response.body.processedItems).toHaveLength(1);

            // Sprawdź czy torebka wróciła do magazynu
            const warehouseItem = await Warehouse.findOne({ goods: testGoods._id });
            expect(warehouseItem).toBeTruthy();
            expect(warehouseItem.size.toString()).toBe(specialBagSize._id.toString());

            // Sprawdź czy została usunięta ze stanu
            const updatedStateItem = await State.findById(stateItem._id);
            expect(updatedStateItem.processed).toBe(true);

            console.log('✅ Test 3c: Torebka zwrócona do magazynu');
        });
    });

    describe('4. Testy integracyjne - pełny cykl torebki', () => {
        it('Powinien obsłużyć pełny cykl: magazyn → użytkownik → sprzedaż', async () => {
            // 1. Dodaj do magazynu
            await request(app)
                .post('/api/warehouse')
                .send({
                    code: testGoods.code,
                    goodsId: testGoods._id,
                    selectedSize: specialBagSize._id,
                    quantity: 1
                });

            // 2. Transfer do użytkownika
            const warehouseItem = await Warehouse.findOne({ goods: testGoods._id });
            await request(app)
                .post('/api/transfer-processing')
                .send({
                    warehouseItems: [
                        {
                            _id: warehouseItem._id,
                            transfer_to: testUser.symbol,
                            isIncomingTransfer: true
                        }
                    ]
                });

            // 3. Sprzedaż
            const stateItem = await State.findOne({ 
                goods: testGoods._id, 
                user: testUser._id 
            });
            const response = await request(app)
                .post('/api/transfer-processing')
                .send({
                    stateItems: [
                        {
                            _id: stateItem._id,
                            isOutgoingTransfer: true,
                            transferType: 'sale'
                        }
                    ]
                });

            expect(response.status).toBe(200);

            // Sprawdź końcowy stan
            const finalStateItem = await State.findById(stateItem._id);
            expect(finalStateItem.processed).toBe(true);

            console.log('✅ Test 4: Pełny cykl torebki zakończony sukcesem');
        });
    });
});