const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Import models only - NOT the app to avoid connecting to production DB
const Bags = require('../app/db/models/bags');
const Goods = require('../app/db/models/goods');
const Stock = require('../app/db/models/stock');
const Color = require('../app/db/models/color');

// Import only the controller we need for testing
const bagsController = require('../app/controllers/bags');

describe('Bags Product Synchronization Tests', () => {
    let mongoServer;

    beforeAll(async () => {
        // BEZPIECZEŃSTWO: Ustaw NODE_ENV=test aby zapobiec połączeniu z produkcyjną bazą
        process.env.NODE_ENV = 'test';
        
        // Disconnect any existing connections to protect production data
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

        // Setup ONLY in-memory MongoDB for testing
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);
    });

    afterAll(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        if (mongoServer) {
            await mongoServer.stop();
        }
    });

    beforeEach(async () => {
        // Clear collections
        await Bags.deleteMany({});
        await Goods.deleteMany({});
        await Stock.deleteMany({});
        await Color.deleteMany({});
    });

    describe('Bag Update Product Name Synchronization', () => {
        test('Should update product names when bag code changes', async () => {
            // 1. Create test bag
            const testBag = new Bags({
                _id: new mongoose.Types.ObjectId(),
                Torebki_Nr: 'TB001',
                Torebki_Kod: 'OLD_BAG_CODE'
            });
            await testBag.save();

            // 2. Create test stock and color
            const testStock = new Stock({
                _id: new mongoose.Types.ObjectId(),
                Tow_Kod: 'TEST_STOCK',
                Tow_Opis: 'Test Stock'
            });
            await testStock.save();

            const testColor = new Color({
                _id: new mongoose.Types.ObjectId(),
                Kol_Kod: 'BLACK',
                Kol_Opis: 'Czarny'
            });
            await testColor.save();

            // 3. Create test product using the bag
            const testProduct = new Goods({
                _id: new mongoose.Types.ObjectId(),
                stock: testStock._id,
                color: testColor._id,
                bagProduct: 'OLD_BAG_CODE', // Uses the old bag code
                fullName: 'Test Product OLD_BAG_CODE Czarny', // Contains old bag code in name
                code: 'PROD_001',
                category: 'Torebki',
                price: 100.00,
                discount_price: 80.00,
                priceExceptions: [],
                Plec: 'Unisex'
            });
            await testProduct.save();

            // 4. Update bag code
            const response = await request(app)
                .patch(`/api/excel/bags/update-bags/${testBag._id}`)
                .send({
                    Torebki_Nr: 'TB001',
                    Torebki_Kod: 'NEW_BAG_CODE' // Change bag code
                });

            // 5. Check response
            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Bag updated successfully and product names synchronized');
            expect(response.body.bag.Torebki_Kod).toBe('NEW_BAG_CODE');

            // 6. Check if product was updated
            const updatedProduct = await Goods.findById(testProduct._id);
            expect(updatedProduct.bagProduct).toBe('NEW_BAG_CODE');
            expect(updatedProduct.fullName).toBe('Test Product NEW_BAG_CODE Czarny');

            console.log('✅ Product synchronization test passed');
            console.log(`Original name: "${testProduct.fullName}"`);
            console.log(`Updated name: "${updatedProduct.fullName}"`);
        });

        test('Should handle multiple products using the same bag code', async () => {
            // 1. Create test bag
            const testBag = new Bags({
                _id: new mongoose.Types.ObjectId(),
                Torebki_Nr: 'TB002',
                Torebki_Kod: 'SHARED_BAG_CODE'
            });
            await testBag.save();

            // 2. Create test dependencies
            const testStock = new Stock({
                _id: new mongoose.Types.ObjectId(),
                Tow_Kod: 'STOCK_1',
                Tow_Opis: 'Stock 1'
            });
            await testStock.save();

            const testColor1 = new Color({
                _id: new mongoose.Types.ObjectId(),
                Kol_Kod: 'RED',
                Kol_Opis: 'Czerwony'
            });
            await testColor1.save();

            const testColor2 = new Color({
                _id: new mongoose.Types.ObjectId(),
                Kol_Kod: 'BLUE',
                Kol_Opis: 'Niebieski'
            });
            await testColor2.save();

            // 3. Create multiple products using the same bag
            const product1 = new Goods({
                _id: new mongoose.Types.ObjectId(),
                stock: testStock._id,
                color: testColor1._id,
                bagProduct: 'SHARED_BAG_CODE',
                fullName: 'Product 1 SHARED_BAG_CODE Czerwony',
                code: 'PROD_001',
                category: 'Torebki',
                price: 150.00,
                discount_price: 120.00,
                priceExceptions: [],
                Plec: 'Damski'
            });
            await product1.save();

            const product2 = new Goods({
                _id: new mongoose.Types.ObjectId(),
                stock: testStock._id,
                color: testColor2._id,
                bagProduct: 'SHARED_BAG_CODE',
                fullName: 'Product 2 SHARED_BAG_CODE Niebieski',
                code: 'PROD_002',
                category: 'Portfele',
                price: 200.00,
                discount_price: 160.00,
                priceExceptions: [],
                Plec: 'Męski'
            });
            await product2.save();

            // 4. Update bag code
            const response = await request(app)
                .patch(`/api/excel/bags/update-bags/${testBag._id}`)
                .send({
                    Torebki_Nr: 'TB002',
                    Torebki_Kod: 'UPDATED_SHARED_CODE'
                });

            // 5. Check response
            expect(response.status).toBe(200);

            // 6. Check if both products were updated
            const updatedProduct1 = await Goods.findById(product1._id);
            const updatedProduct2 = await Goods.findById(product2._id);

            expect(updatedProduct1.bagProduct).toBe('UPDATED_SHARED_CODE');
            expect(updatedProduct1.fullName).toBe('Product 1 UPDATED_SHARED_CODE Czerwony');

            expect(updatedProduct2.bagProduct).toBe('UPDATED_SHARED_CODE');
            expect(updatedProduct2.fullName).toBe('Product 2 UPDATED_SHARED_CODE Niebieski');

            console.log('✅ Multiple products synchronization test passed');
        });

        test('Should not affect products from other categories', async () => {
            // 1. Create test bag
            const testBag = new Bags({
                _id: new mongoose.Types.ObjectId(),
                Torebki_Nr: 'TB003',
                Torebki_Kod: 'BAG_FOR_UPDATE'
            });
            await testBag.save();

            // 2. Create dependencies
            const testStock = new Stock({
                _id: new mongoose.Types.ObjectId(),
                Tow_Kod: 'STOCK_TEST',
                Tow_Opis: 'Test Stock'
            });
            await testStock.save();

            const testColor = new Color({
                _id: new mongoose.Types.ObjectId(),
                Kol_Kod: 'GREEN',
                Kol_Opis: 'Zielony'
            });
            await testColor.save();

            // 3. Create products in different categories
            const bagProduct = new Goods({
                _id: new mongoose.Types.ObjectId(),
                stock: testStock._id,
                color: testColor._id,
                bagProduct: 'BAG_FOR_UPDATE',
                fullName: 'Bag Product BAG_FOR_UPDATE Zielony',
                code: 'BAG_001',
                category: 'Torebki', // Should be updated
                price: 100.00,
                priceExceptions: [],
                Plec: 'Damski'
            });
            await bagProduct.save();

            const jacketProduct = new Goods({
                _id: new mongoose.Types.ObjectId(),
                stock: testStock._id,
                color: testColor._id,
                fullName: 'Jacket BAG_FOR_UPDATE Zielony', // Contains same text but different category
                code: 'JACKET_001',
                category: 'Kurtki kożuchy futra', // Should NOT be updated
                price: 300.00,
                priceExceptions: [],
                Plec: 'Męski'
            });
            await jacketProduct.save();

            // 4. Update bag code
            const response = await request(app)
                .patch(`/api/excel/bags/update-bags/${testBag._id}`)
                .send({
                    Torebki_Nr: 'TB003',
                    Torebki_Kod: 'UPDATED_BAG_CODE'
                });

            // 5. Check response
            expect(response.status).toBe(200);

            // 6. Check products
            const updatedBagProduct = await Goods.findById(bagProduct._id);
            const unchangedJacketProduct = await Goods.findById(jacketProduct._id);

            // Bag product should be updated
            expect(updatedBagProduct.bagProduct).toBe('UPDATED_BAG_CODE');
            expect(updatedBagProduct.fullName).toBe('Bag Product UPDATED_BAG_CODE Zielony');

            // Jacket product should remain unchanged
            expect(unchangedJacketProduct.fullName).toBe('Jacket BAG_FOR_UPDATE Zielony');
            expect(unchangedJacketProduct.bagProduct).toBeUndefined(); // No bagProduct field

            console.log('✅ Category isolation test passed');
        });
    });
});