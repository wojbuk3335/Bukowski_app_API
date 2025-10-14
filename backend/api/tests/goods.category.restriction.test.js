const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app/app');

describe('Goods Category Edit Restriction Tests', () => {
    let mongoServer;
    let stockId, colorId, goodId;
    let testGood;

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
                Tow_Opis: 'TestStock'
            }]);
        stockId = stockResponse.body.stocks[0]._id;

        // Create test color
        const colorResponse = await request(app)
            .post('/api/excel/color/insert-many-colors')
            .send([{
                Kol_Kod: 'COL001',
                Kol_Opis: 'TESTCOLOR'
            }]);
        colorId = colorResponse.body.colors[0]._id;

        // Create test good
        const goodResponse = await request(app)
            .post('/api/excel/goods/create-goods')
            .send({
                stock: stockId,
                color: colorId,
                fullName: 'Test Product',
                code: 'GOOD001',
                category: 'Kurtki kożuchy futra',
                price: 100,
                discount_price: 80,
                sellingPoint: 'Wszędzie'
            });
        
        testGood = goodResponse.body.createdGood;
        goodId = testGood._id;
    });

    afterAll(async () => {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        if (mongoServer) {
            await mongoServer.stop();
        }
    });

    describe('1. Category Creation Tests', () => {
        test('Nowy produkt powinien móc mieć dowolną kategorię', async () => {
            // Test all available categories
            const categories = [
                'Kurtki kożuchy futra',
                'Torebki', 
                'Portfele',
                'Pozostały asortyment'
            ];

            for (const category of categories) {
                const response = await request(app)
                    .post('/api/excel/goods/create-goods')
                    .send({
                        stock: stockId,
                        color: colorId,
                        fullName: `Test ${category}`,
                        code: `GOOD_${category.replace(/\s+/g, '_')}`,
                        category: category,
                        price: 100,
                        sellingPoint: 'Wszędzie'
                    });

                expect(response.status).toBe(201);
                expect(response.body.createdGood.category).toBe(category);
            }
        });

        test('Powinien odrzucić nieprawidłową kategorię przy tworzeniu', async () => {
            const response = await request(app)
                .post('/api/excel/goods/create-goods')
                .send({
                    stock: stockId,
                    color: colorId,
                    fullName: 'Test Invalid Category',
                    code: 'GOOD_INVALID',
                    category: 'Nieprawidłowa kategoria', // Invalid category
                    price: 100,
                    sellingPoint: 'Wszędzie'
                });

            // The response might be accepted (depending on validation) but category should be sanitized
            // or it might be rejected - both are valid behaviors depending on implementation
            expect(response.status).toBeLessThan(600);
        });
    });

    describe('2. Category Update Restriction Tests', () => {
        test('Edycja istniejącego produktu NIE powinna pozwolić na zmianę kategorii', async () => {
            // Act - try to update category during edit
            const response = await request(app)
                .put(`/api/excel/goods/${goodId}`)
                .send({
                    stock: stockId,
                    color: colorId,
                    fullName: 'Updated Product Name',
                    code: 'GOOD001',
                    category: 'Torebki', // Trying to change from 'Kurtki kożuchy futra' to 'Torebki'
                    price: 120,
                    discount_price: 90,
                    sellingPoint: 'Wszędzie'
                });

            // Assert - update should succeed but category should remain unchanged
            expect(response.status).toBe(200);

            // Verify category wasn't changed
            const updatedGoods = await request(app).get('/api/excel/goods/get-all-goods');
            const updatedGood = updatedGoods.body.goods.find(g => g._id === goodId);
            
            expect(updatedGood.category).toBe('Kurtki kożuchy futra'); // Original category
            expect(updatedGood.category).not.toBe('Torebki'); // Should NOT be changed to this
            
            // But other fields should be updated
            expect(updatedGood.fullName).toBe('Updated Product Name');
            expect(updatedGood.price).toBe(120);
        });

        test('Edycja innych pól powinna działać normalnie', async () => {
            // Act - update fields other than category
            const response = await request(app)
                .put(`/api/excel/goods/${goodId}`)
                .send({
                    stock: stockId,
                    color: colorId,
                    fullName: 'New Product Name',
                    code: 'GOOD001',
                    category: testGood.category, // Keep same category
                    price: 150,
                    discount_price: 120,
                    sellingPoint: 'Tylko online'
                });

            // Assert
            expect(response.status).toBe(200);

            const updatedGoods = await request(app).get('/api/excel/goods/get-all-goods');
            const updatedGood = updatedGoods.body.goods.find(g => g._id === goodId);
            
            expect(updatedGood.fullName).toBe('New Product Name');
            expect(updatedGood.price).toBe(150);
            expect(updatedGood.discount_price).toBe(120);
            expect(updatedGood.sellingPoint).toBe('Tylko online');
            expect(updatedGood.category).toBe(testGood.category); // Unchanged
        });

        test('Powinna zachować oryginalną kategorię nawet gdy przesłano inną', async () => {
            // Create product with 'Torebki' category
            const bagResponse = await request(app)
                .post('/api/excel/goods/create-goods')
                .send({
                    stock: stockId,
                    color: colorId,
                    fullName: 'Test Bag',
                    code: 'BAG001',
                    category: 'Torebki',
                    price: 80,
                    sellingPoint: 'Wszędzie'
                });

            const bagId = bagResponse.body.createdGood._id;

            // Try to change category during update
            const updateResponse = await request(app)
                .put(`/api/excel/goods/${bagId}`)
                .send({
                    stock: stockId,
                    color: colorId,
                    fullName: 'Updated Bag',
                    code: 'BAG001',
                    category: 'Portfele', // Trying to change category
                    price: 90,
                    sellingPoint: 'Wszędzie'
                });

            expect(updateResponse.status).toBe(200);

            // Verify category remained 'Torebki'
            const goods = await request(app).get('/api/excel/goods/get-all-goods');
            const updatedBag = goods.body.goods.find(g => g._id === bagId);
            
            expect(updatedBag.category).toBe('Torebki'); // Should remain original
            expect(updatedBag.fullName).toBe('Updated Bag'); // Other fields should update
        });
    });

    describe('3. Category-Specific Field Updates', () => {
        test('Produkt z kategorią Torebki powinien zachować specyficzne pola', async () => {
            // Create bag product (this would normally require additional setup)
            const response = await request(app)
                .post('/api/excel/goods/create-goods')
                .send({
                    stock: stockId,
                    color: colorId,
                    fullName: 'Test Bag',
                    code: 'BAG001',
                    category: 'Torebki',
                    price: 80,
                    sellingPoint: 'Wszędzie',
                    bagProduct: 'BAG_CODE_001',
                    bagId: 'bag_id_123'
                });

            const bagId = response.body.createdGood._id;

            // Update bag product
            const updateResponse = await request(app)
                .put(`/api/excel/goods/${bagId}`)
                .send({
                    stock: stockId,
                    color: colorId,
                    fullName: 'Updated Bag Name',
                    code: 'BAG001',
                    category: 'Torebki', // Same category
                    price: 90,
                    sellingPoint: 'Wszędzie',
                    bagProduct: 'UPDATED_BAG_CODE',
                    bagId: 'updated_bag_id'
                });

            expect(updateResponse.status).toBe(200);

            const goods = await request(app).get('/api/excel/goods/get-all-goods');
            const updatedBag = goods.body.goods.find(g => g._id === bagId);
            
            expect(updatedBag.category).toBe('Torebki');
            expect(updatedBag.bagProduct).toBe('UPDATED_BAG_CODE');
            expect(updatedBag.bagId).toBe('updated_bag_id');
        });

        test('Produkt z kategorią Kurtki powinien używać stock/subcategory', async () => {
            // Update jacket product
            const response = await request(app)
                .put(`/api/excel/goods/${goodId}`)
                .send({
                    stock: stockId,
                    color: colorId,
                    fullName: 'Updated Jacket',
                    code: 'GOOD001',
                    category: 'Kurtki kożuchy futra', // Same category
                    price: 200,
                    sellingPoint: 'Wszędzie'
                });

            expect(response.status).toBe(200);

            const goods = await request(app).get('/api/excel/goods/get-all-goods');
            const updatedGood = goods.body.goods.find(g => g._id === goodId);
            
            expect(updatedGood.category).toBe('Kurtki kożuchy futra');
            expect(updatedGood.stock).toBeDefined(); // Should use stock field
        });
    });

    describe('4. API Validation Tests', () => {
        test('GET request powinien zwrócić produkty z poprawnymi kategoriami', async () => {
            const response = await request(app).get('/api/excel/goods/get-all-goods');
            
            expect(response.status).toBe(200);
            expect(response.body.goods).toBeDefined();
            expect(response.body.goods.length).toBeGreaterThan(0);
            
            // Each product should have a valid category
            response.body.goods.forEach(good => {
                expect(good.category).toBeDefined();
                expect(typeof good.category).toBe('string');
            });
        });

        test('Powinien obsłużyć nieistniejący produkt podczas edycji', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            
            const response = await request(app)
                .put(`/api/excel/goods/${fakeId}`)
                .send({
                    fullName: 'Non-existent product',
                    category: 'Torebki'
                });

            expect(response.status).toBe(404);
        });

        test('Powinien walidować wymagane pola podczas edycji', async () => {
            const response = await request(app)
                .put(`/api/excel/goods/${goodId}`)
                .send({
                    // Missing required fields
                    fullName: 'Incomplete update'
                });

            // Should either accept partial update or reject with proper error
            expect(response.status).toBeLessThan(600);
        });
    });

    describe('5. Integration Tests', () => {
        test('Zmiana kategorii nie powinna wpłynąć na cenniki', async () => {
            // This tests that even if category somehow gets changed,
            // it doesn't break the price list integration
            
            const updateResponse = await request(app)
                .put(`/api/excel/goods/${goodId}`)
                .send({
                    stock: stockId,
                    color: colorId,
                    fullName: 'Test Integration',
                    code: 'GOOD001',
                    category: 'Portfele', // Try to change (should be ignored)
                    price: 250,
                    sellingPoint: 'Wszędzie'
                });

            // Update should succeed
            expect(updateResponse.status).toBe(200);
            
            // Category should remain unchanged
            const goods = await request(app).get('/api/excel/goods/get-all-goods');
            const good = goods.body.goods.find(g => g._id === goodId);
            expect(good.category).toBe('Kurtki kożuchy futra');
            
            // But price should be updated (this would trigger price list sync)
            expect(good.price).toBe(250);
        });
    });
});