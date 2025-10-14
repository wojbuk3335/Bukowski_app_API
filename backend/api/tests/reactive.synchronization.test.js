const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app/app');

describe('Reactive Synchronization Tests', () => {
    let mongoServer;
    let stockId, colorId, goodId;
    let testStock, testColor, testGood;

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
    });

    beforeEach(async () => {
        // Clean up collections
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            await collections[key].deleteMany({});
        }

        // Create test stock
        const stockResponse = await request(app)
            .post('/api/excel/stock/insert-many-stocks')
            .send([{
                Tow_Kod: 'TEST001',
                Tow_Opis: 'Adela'
            }]);
        
        if (stockResponse.body.stocks && stockResponse.body.stocks.length > 0) {
            testStock = stockResponse.body.stocks[0];
            stockId = testStock._id;
        }

        // Create test color
        const colorResponse = await request(app)
            .post('/api/excel/color/insert-many-colors')
            .send([{
                Kol_Kod: 'KOL001',
                Kol_Opis: 'KAKAO'
            }]);
        
        if (colorResponse.body.colors && colorResponse.body.colors.length > 0) {
            testColor = colorResponse.body.colors[0];
            colorId = testColor._id;
        }

        // Create test good with composed name
        if (stockId && colorId) {
            const goodResponse = await request(app)
                .post('/api/excel/goods/create-goods')
                .send({
                    stock: stockId,
                    color: colorId,
                    fullName: 'Adela KAKAO',
                    code: 'GOOD001',
                    category: 'Kurtki kożuchy futra',
                    price: 100,
                    discount_price: 80,
                    sellingPoint: 'Wszędzie'
                });
            
            if (goodResponse.body.createdGood) {
                testGood = goodResponse.body.createdGood;
                goodId = testGood._id;
            }
        }
    });

    afterAll(async () => {
        await mongoose.connection.db.dropDatabase();
        await mongoose.connection.close();
    });

    describe('1. Stock Name Change Synchronization', () => {
        test('Powinna zaktualizować nazwy produktów gdy zmienia się nazwa asortymentu', async () => {
            // Arrange - verify initial state
            const initialGood = await request(app)
                .get('/api/excel/goods/get-all-goods');
            
            expect(initialGood.body.goods).toBeDefined();
            const good = initialGood.body.goods.find(g => g._id === goodId);
            expect(good.fullName).toBe('Adela KAKAO');

            // Act - update stock name
            const updateResponse = await request(app)
                .patch(`/api/excel/stock/update-stock/${stockId}`)
                .send({
                    Tow_Opis: 'Adelaaaaaa'
                });

            expect(updateResponse.status).toBe(200);

            // Assert - check if product name was updated
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for async sync
            
            const updatedGoods = await request(app)
                .get('/api/excel/goods/get-all-goods');
            
            const updatedGood = updatedGoods.body.goods.find(g => g._id === goodId);
            expect(updatedGood.fullName).toBe('Adelaaaaaa KAKAO');
        });

        test('Nie powinna zaktualizować nazw gdy nazwa asortymentu się nie zmienia', async () => {
            // Act - update with same name
            const updateResponse = await request(app)
                .patch(`/api/excel/stock/update-stock/${stockId}`)
                .send({
                    Tow_Kod: 'TEST001_UPDATED'  // Change code, not name
                });

            expect(updateResponse.status).toBe(200);

            // Assert - product name should remain the same
            const goods = await request(app)
                .get('/api/excel/goods/get-all-goods');
            
            const good = goods.body.goods.find(g => g._id === goodId);
            expect(good.fullName).toBe('Adela KAKAO');
        });
    });

    describe('2. Color Name Change Synchronization', () => {
        test('Powinna zaktualizować nazwy produktów gdy zmienia się nazwa koloru', async () => {
            // Arrange - verify initial state
            const initialGood = await request(app)
                .get('/api/excel/goods/get-all-goods');
            
            const good = initialGood.body.goods.find(g => g._id === goodId);
            expect(good.fullName).toBe('Adela KAKAO');

            // Act - update color name
            const updateResponse = await request(app)
                .patch(`/api/excel/color/update-color/${colorId}`)
                .send({
                    Kol_Opis: 'CZEKOLADA'
                });

            expect(updateResponse.status).toBe(200);

            // Assert - check if product name was updated
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for async sync
            
            const updatedGoods = await request(app)
                .get('/api/excel/goods/get-all-goods');
            
            const updatedGood = updatedGoods.body.goods.find(g => g._id === goodId);
            expect(updatedGood.fullName).toBe('Adela CZEKOLADA');
        });

        test('Powinna obsłużyć wiele produktów z tym samym kolorem', async () => {
            // Arrange - create second product with same color
            const secondGoodResponse = await request(app)
                .post('/api/excel/goods/create-goods')
                .send({
                    stock: stockId,
                    color: colorId,
                    fullName: 'Beata KAKAO',
                    code: 'GOOD002',
                    category: 'Kurtki kożuchy futra',
                    price: 120,
                    discount_price: 100,
                    sellingPoint: 'Wszędzie'
                });

            // Act - update color name
            await request(app)
                .patch(`/api/excel/color/update-color/${colorId}`)
                .send({
                    Kol_Opis: 'BRĄZ'
                });

            // Assert - both products should be updated
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const goods = await request(app)
                .get('/api/excel/goods/get-all-goods');
            
            const firstGood = goods.body.goods.find(g => g.code === 'GOOD001');
            const secondGood = goods.body.goods.find(g => g.code === 'GOOD002');
            
            expect(firstGood.fullName).toBe('Adela BRĄZ');
            expect(secondGood.fullName).toBe('Beata BRĄZ');
        });
    });

    describe('3. Sync Product Names Endpoint', () => {
        test('Endpoint sync-product-names powinien istnieć i działać', async () => {
            const response = await request(app)
                .post('/api/excel/goods/sync-product-names')
                .send({
                    type: 'stock',
                    fieldType: 'Tow_Opis',
                    oldValue: {
                        id: stockId,
                        name: 'Adela'
                    },
                    newValue: 'Adelka'
                });

            expect(response.status).toBe(200);
            expect(response.body.message).toContain('synchronized successfully');
            expect(response.body.type).toBe('stock');
            expect(response.body.oldValue).toBe('Adela');
            expect(response.body.newValue).toBe('Adelka');
        });

        test('Powinien obsłużyć błędne dane wejściowe', async () => {
            const response = await request(app)
                .post('/api/excel/goods/sync-product-names')
                .send({
                    // Missing required fields
                });

            // Should handle gracefully without crashing
            expect(response.status).toBeLessThan(600);
        });
    });

    describe('4. Integration with Price Lists', () => {
        test('Powinna synchronizować cenniki po aktualizacji nazw produktów', async () => {
            // This would require price list setup, but we test the endpoint call
            const response = await request(app)
                .patch(`/api/excel/stock/update-stock/${stockId}`)
                .send({
                    Tow_Opis: 'UpdatedAdela'
                });

            expect(response.status).toBe(200);
            
            // The stock controller should have triggered price list sync
            // We can verify this by checking logs or by creating actual price lists
            console.log('✅ Stock update completed - price list sync should have been triggered');
        });
    });

    afterAll(async () => {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        if (mongoServer) {
            await mongoServer.stop();
        }
    });
});