const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Import models
const User = require('../app/db/models/user');
const Goods = require('../app/db/models/goods');
const Size = require('../app/db/models/size');
const Color = require('../app/db/models/color');
const Warehouse = require('../app/db/models/warehouse');
const State = require('../app/db/models/state');
const Transfer = require('../app/db/models/transfer');
const History = require('../app/db/models/history');
const WalletsCategory = require('../app/db/models/walletsCategory');

let mongoServer;

describe('Wallets Basic Tests', () => {
    let testUser, warehouseUser, testGoodsWallet, testSizeWallet, testWalletCategory, testColor;

    beforeAll(async () => {
        // Create in-memory MongoDB instance
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        
        // Connect to the in-memory database
        await mongoose.connect(mongoUri);
    });

    afterAll(async () => {
        // Cleanup database and close connections
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        // Clear collections
        await User.deleteMany({});
        await Goods.deleteMany({});
        await Size.deleteMany({});
        await Color.deleteMany({});
        await Warehouse.deleteMany({});
        await State.deleteMany({});
        await Transfer.deleteMany({});
        await History.deleteMany({});
        await WalletsCategory.deleteMany({});

        // Create test users
        testUser = await User.create({
            _id: new mongoose.Types.ObjectId(),
            email: 'test.user.basic@example.com',
            password: 'password123',
            sellingPoint: 'P',
            location: 'Test Location P',
            symbol: 'P',
            role: 'user'
        });

        warehouseUser = await User.create({
            _id: new mongoose.Types.ObjectId(),
            email: 'test.warehouse.basic@example.com', 
            password: 'password123',
            symbol: 'MAGAZYN',
            role: 'magazyn'
        });

        // Create color
        testColor = await Color.create({
            _id: new mongoose.Types.ObjectId(),
            Kol_Kod: 'CZARNA',
            Kol_Opis: 'Czarna'
        });

        // Create wallet category
        testWalletCategory = await WalletsCategory.create({
            _id: new mongoose.Types.ObjectId(),
            Kat_1_Kod_1: 'BASIC_WALLET_CAT',
            Kat_1_Opis_1: 'Basic test wallet category',
            Plec: 'UNISEX'
        });

        // Create wallet size
        testSizeWallet = await Size.create({
            _id: new mongoose.Types.ObjectId(),
            Roz_Kod: 'PORTFEL',
            Roz_Opis: 'Rozmiar portfela'
        });

        // Create wallet goods
        testGoodsWallet = await Goods.create({
            _id: new mongoose.Types.ObjectId(),
            code: 'BASIC_WALLET_001',
            fullName: 'Basic Test Wallet Black',
            price: 100,
            category: 'Portfele',
            color: testColor._id
        });
    });

    describe('Model Creation Tests', () => {
        it('Powinien utworzyć użytkownika', async () => {
            expect(testUser).toBeTruthy();
            expect(testUser.symbol).toBe('P');
            expect(testUser.role).toBe('user');
            expect(testUser.location).toBe('Test Location P');

            console.log('✅ Użytkownik utworzony pomyślnie');
        });

        it('Powinien utworzyć magazyn', async () => {
            expect(warehouseUser).toBeTruthy();
            expect(warehouseUser.symbol).toBe('MAGAZYN');
            expect(warehouseUser.role).toBe('magazyn');

            console.log('✅ Magazyn utworzony pomyślnie');
        });

        it('Powinien utworzyć portfel (towar)', async () => {
            expect(testGoodsWallet).toBeTruthy();
            expect(testGoodsWallet.fullName).toBe('Basic Test Wallet Black');
            expect(testGoodsWallet.price).toBe(100);
            expect(testGoodsWallet.category).toBe('Portfele');

            console.log('✅ Portfel (towar) utworzony pomyślnie');
        });

        it('Powinien utworzyć rozmiar portfela', async () => {
            expect(testSizeWallet).toBeTruthy();
            expect(testSizeWallet.Roz_Kod).toBe('PORTFEL');
            expect(testSizeWallet.Roz_Opis).toBe('Rozmiar portfela');

            console.log('✅ Rozmiar portfela utworzony pomyślnie');
        });

        it('Powinien utworzyć kategorię portfeli', async () => {
            expect(testWalletCategory).toBeTruthy();
            expect(testWalletCategory.Kat_1_Kod_1).toBe('BASIC_WALLET_CAT');
            expect(testWalletCategory.Kat_1_Opis_1).toBe('Basic test wallet category');

            console.log('✅ Kategoria portfeli utworzona pomyślnie');
        });

        it('Powinien utworzyć kolor', async () => {
            expect(testColor).toBeTruthy();
            expect(testColor.Kol_Kod).toBe('CZARNA');
            expect(testColor.Kol_Opis).toBe('Czarna');

            console.log('✅ Kolor utworzony pomyślnie');
        });
    });

    describe('Wallet Operations', () => {
        it('Powinien dodać portfel do magazynu', async () => {
            // Create wallet in warehouse with all required fields
            const warehouseWallet = await Warehouse.create({
                _id: new mongoose.Types.ObjectId(),
                fullName: testGoodsWallet._id,
                goods: testGoodsWallet._id,
                size: testSizeWallet._id,
                barcode: 'BASIC_WALLET_WAREHOUSE_001',
                symbol: 'MAGAZYN_GŁÓWNY',
                movementType: 'IN',
                date: new Date(),
                note: 'Test wallet added to warehouse'
            });

            expect(warehouseWallet).toBeTruthy();
            expect(warehouseWallet.symbol).toBe('MAGAZYN_GŁÓWNY');
            expect(warehouseWallet.movementType).toBe('IN');
            expect(warehouseWallet.barcode).toBe('BASIC_WALLET_WAREHOUSE_001');

            console.log('✅ Portfel dodany do magazynu');
        });

        it('Powinien znaleźć portfel w magazynie', async () => {
            // Create wallet in warehouse
            await Warehouse.create({
                _id: new mongoose.Types.ObjectId(),
                fullName: testGoodsWallet._id,
                goods: testGoodsWallet._id,
                size: testSizeWallet._id,
                barcode: 'BASIC_WALLET_SEARCH_002',
                symbol: 'MAGAZYN_GŁÓWNY',
                movementType: 'IN',
                date: new Date()
            });

            // Search for wallet
            const foundWallet = await Warehouse.findOne({ 
                barcode: 'BASIC_WALLET_SEARCH_002' 
            }).populate('goods size');

            expect(foundWallet).toBeTruthy();
            expect(foundWallet.goods.fullName).toBe('Basic Test Wallet Black');
            expect(foundWallet.size.Roz_Kod).toBe('PORTFEL');

            console.log('✅ Portfel znaleziony w magazynie');
        });

        it('Powinien przenieść portfel do stanu użytkownika', async () => {
            // Create wallet in user state with all required fields
            const userStateWallet = await State.create({
                _id: new mongoose.Types.ObjectId(),
                fullName: testGoodsWallet._id,
                size: testSizeWallet._id,
                sellingPoint: testUser._id, // ObjectId, not string
                price: 100,
                barcode: 'BASIC_WALLET_STATE_003',
                date: new Date()
            });

            expect(userStateWallet).toBeTruthy();
            expect(userStateWallet.price).toBe(100);
            expect(userStateWallet.barcode).toBe('BASIC_WALLET_STATE_003');

            console.log('✅ Portfel przeniesiony do stanu użytkownika');
        });

        it('Powinien utworzyć poprawny transfer portfela', async () => {
            // Create transfer record with correct schema fields
            const walletTransfer = await Transfer.create({
                fullName: testGoodsWallet.fullName, // String, not ObjectId
                size: testSizeWallet.Roz_Kod, // String, not ObjectId
                date: new Date(),
                dateString: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
                productId: testGoodsWallet._id.toString(),
                transfer_to: testUser.symbol,
                transfer_from: 'MAGAZYN',
                processed: false
            });

            expect(walletTransfer).toBeTruthy();
            expect(walletTransfer.transfer_to).toBe('P');
            expect(walletTransfer.transfer_from).toBe('MAGAZYN');
            expect(walletTransfer.processed).toBe(false);

            console.log('✅ Transfer portfela utworzony');
        });
    });

    describe('Database Relationships', () => {
        it('Powinien poprawnie łączyć portfel z kolorem', async () => {
            const populatedGoods = await Goods.findById(testGoodsWallet._id)
                .populate('color');

            expect(populatedGoods.color).toBeTruthy();
            expect(populatedGoods.color.Kol_Kod).toBe('CZARNA');

            console.log('✅ Portfel połączony z kolorem');
        });

        it('Powinien znaleźć wszystkie portfele danego koloru', async () => {
            // Create another wallet with the same color
            const anotherWallet = await Goods.create({
                _id: new mongoose.Types.ObjectId(),
                code: 'ANOTHER_WALLET_002',
                fullName: 'Another Black Wallet',
                price: 150,
                category: 'Portfele',
                color: testColor._id
            });

            // Find all wallets with black color
            const blackWallets = await Goods.find({ 
                color: testColor._id,
                category: 'Portfele'
            });

            expect(blackWallets).toHaveLength(2);
            expect(blackWallets[0].category).toBe('Portfele');
            expect(blackWallets[1].category).toBe('Portfele');

            console.log('✅ Znaleziono portfele według koloru');
        });
    });
});