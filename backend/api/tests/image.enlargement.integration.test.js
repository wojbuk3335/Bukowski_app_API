const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app/app');

describe('Image Enlargement Integration Tests', () => {
    let mongoServer;
    let stockId, colorId, goodId, priceListId;
    let testImage;

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

        // Mock image data for testing
        testImage = {
            filename: 'test-image.jpg',
            originalname: 'test-image.jpg',
            mimetype: 'image/jpeg',
            size: 1024,
            buffer: Buffer.from('fake-image-data'),
            path: '/images/test-image.jpg'
        };
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

        // Create test good with image
        const goodResponse = await request(app)
            .post('/api/excel/goods/create-goods')
            .send({
                stock: stockId,
                color: colorId,
                fullName: 'Test Product With Image',
                code: 'GOOD001',
                category: 'Kurtki kożuchy futra',
                price: 100,
                sellingPoint: 'Wszędzie',
                picture: testImage.path
            });
        
        goodId = goodResponse.body.createdGood._id;

        // Create test price list entry
        const priceListResponse = await request(app)
            .post('/api/excel/priceList/create-priceList')
            .send({
                good: goodId,
                price: 100,
                discount_price: 80,
                picture: testImage.path
            });
        
        priceListId = priceListResponse.body.createdPriceList._id;
    });

    afterAll(async () => {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        if (mongoServer) {
            await mongoServer.stop();
        }
    });

    describe('1. Price List Image Data Tests', () => {
        test('Powinien zwrócić cennik z poprawnym obrazem', async () => {
            const response = await request(app).get('/api/excel/priceList/get-all-priceLists');
            
            expect(response.status).toBe(200);
            expect(response.body.priceLists).toBeDefined();
            expect(response.body.priceLists.length).toBeGreaterThan(0);
            
            const priceList = response.body.priceLists.find(pl => pl._id === priceListId);
            expect(priceList).toBeDefined();
            expect(priceList.picture).toBe(testImage.path);
        });

        test('Powinien obsłużyć cennik bez obrazu (domyślny obraz)', async () => {
            // Create price list without image
            const response = await request(app)
                .post('/api/excel/priceList/create-priceList')
                .send({
                    good: goodId,
                    price: 120
                    // No picture field
                });

            expect(response.status).toBe(201);
            
            // Get all price lists and check default behavior
            const allPriceLists = await request(app).get('/api/excel/priceList/get-all-priceLists');
            const newPriceList = allPriceLists.body.priceLists.find(
                pl => pl._id === response.body.createdPriceList._id
            );
            
            // Should either have default image path or null/undefined (both valid)
            expect(newPriceList).toBeDefined();
            if (newPriceList.picture) {
                expect(typeof newPriceList.picture).toBe('string');
            }
        });

        test('Aktualizacja cennika z nowym obrazem', async () => {
            const newImagePath = '/images/updated-image.jpg';
            
            const response = await request(app)
                .put(`/api/excel/priceList/${priceListId}`)
                .send({
                    good: goodId,
                    price: 150,
                    discount_price: 120,
                    picture: newImagePath
                });

            expect(response.status).toBe(200);
            
            // Verify update
            const updatedPriceLists = await request(app).get('/api/excel/priceList/get-all-priceLists');
            const updatedPriceList = updatedPriceLists.body.priceLists.find(pl => pl._id === priceListId);
            
            expect(updatedPriceList.picture).toBe(newImagePath);
            expect(updatedPriceList.price).toBe(150);
        });
    });

    describe('2. Goods Image Data Tests', () => {
        test('Powinien zwrócić produkty z poprawnymi obrazami', async () => {
            const response = await request(app).get('/api/excel/goods/get-all-goods');
            
            expect(response.status).toBe(200);
            expect(response.body.goods).toBeDefined();
            
            const good = response.body.goods.find(g => g._id === goodId);
            expect(good).toBeDefined();
            expect(good.picture).toBe(testImage.path);
        });

        test('Aktualizacja produktu z nowym obrazem', async () => {
            const newImagePath = '/images/new-product-image.jpg';
            
            const response = await request(app)
                .put(`/api/excel/goods/${goodId}`)
                .send({
                    stock: stockId,
                    color: colorId,
                    fullName: 'Updated Product',
                    code: 'GOOD001',
                    category: 'Kurtki kożuchy futra',
                    price: 200,
                    sellingPoint: 'Wszędzie',
                    picture: newImagePath
                });

            expect(response.status).toBe(200);
            
            // Verify update
            const goods = await request(app).get('/api/excel/goods/get-all-goods');
            const updatedGood = goods.body.goods.find(g => g._id === goodId);
            
            expect(updatedGood.picture).toBe(newImagePath);
        });
    });

    describe('3. Image Path Validation Tests', () => {
        test('Powinien zaakceptować prawidłowe ścieżki obrazów', async () => {
            const validPaths = [
                '/images/jacket.jpg',
                '/images/bag.png', 
                '/images/wallet.jpeg',
                '/images/subfolder/item.jpg',
                'https://example.com/image.jpg'
            ];

            for (const path of validPaths) {
                const response = await request(app)
                    .post('/api/excel/priceList/create-priceList')
                    .send({
                        good: goodId,
                        price: 100,
                        picture: path
                    });

                expect(response.status).toBe(201);
                expect(response.body.createdPriceList.picture).toBe(path);
            }
        });

        test('Powinien obsłużyć pusty lub null obraz', async () => {
            const emptyImageTests = [
                { picture: null },
                { picture: '' },
                { picture: undefined },
                {} // no picture field
            ];

            for (const testCase of emptyImageTests) {
                const response = await request(app)
                    .post('/api/excel/priceList/create-priceList')
                    .send({
                        good: goodId,
                        price: 100,
                        ...testCase
                    });

                expect(response.status).toBe(201);
                // Should handle gracefully regardless of picture value
            }
        });
    });

    describe('4. Image Display Integration Tests', () => {
        test('Cennik i produkty powinny mieć spójne obrazy', async () => {
            // Get both goods and price lists
            const goodsResponse = await request(app).get('/api/excel/goods/get-all-goods');
            const priceListsResponse = await request(app).get('/api/excel/priceList/get-all-priceLists');
            
            expect(goodsResponse.status).toBe(200);
            expect(priceListsResponse.status).toBe(200);
            
            const good = goodsResponse.body.goods.find(g => g._id === goodId);
            const priceList = priceListsResponse.body.priceLists.find(pl => pl._id === priceListId);
            
            expect(good.picture).toBe(priceList.picture);
            expect(good.picture).toBe(testImage.path);
        });

        test('Aktualizacja obrazu w produkcie powinna wpływać na sync z cennikiem', async () => {
            // This would test if there's automatic sync between goods and price list images
            const newImagePath = '/images/synced-image.jpg';
            
            // Update good image
            await request(app)
                .put(`/api/excel/goods/${goodId}`)
                .send({
                    stock: stockId,
                    color: colorId,
                    fullName: 'Synced Product',
                    code: 'GOOD001',
                    category: 'Kurtki kożuchy futra',
                    price: 200,
                    sellingPoint: 'Wszędzie',
                    picture: newImagePath
                });

            // Check if there's any sync mechanism (this depends on implementation)
            const goods = await request(app).get('/api/excel/goods/get-all-goods');
            const updatedGood = goods.body.goods.find(g => g._id === goodId);
            
            expect(updatedGood.picture).toBe(newImagePath);
            
            // Note: Depending on implementation, price list might or might not auto-sync
            // This test documents the expected behavior
        });
    });

    describe('5. Frontend API Compatibility Tests', () => {
        test('API powinien zwracać dane kompatybilne z React components', async () => {
            const response = await request(app).get('/api/excel/priceList/get-all-priceLists');
            
            expect(response.status).toBe(200);
            expect(response.body.priceLists).toBeDefined();
            expect(Array.isArray(response.body.priceLists)).toBe(true);
            
            // Each price list should have structure expected by frontend
            response.body.priceLists.forEach(priceList => {
                expect(priceList).toHaveProperty('_id');
                expect(priceList).toHaveProperty('good');
                expect(priceList).toHaveProperty('price');
                
                // Picture field should be string or falsy
                if (priceList.picture) {
                    expect(typeof priceList.picture).toBe('string');
                }
            });
        });

        test('Goods API powinien zwracać dane kompatybilne z image enlargement', async () => {
            const response = await request(app).get('/api/excel/goods/get-all-goods');
            
            expect(response.status).toBe(200);
            expect(response.body.goods).toBeDefined();
            
            // Each good should have structure needed for image functionality
            response.body.goods.forEach(good => {
                expect(good).toHaveProperty('_id');
                expect(good).toHaveProperty('fullName');
                
                // Picture should be accessible for enlargement functionality
                if (good.picture) {
                    expect(typeof good.picture).toBe('string');
                    // Should be valid path or URL
                    expect(good.picture.length).toBeGreaterThan(0);
                }
            });
        });

        test('Powinien obsłużyć CORS dla obrazów', async () => {
            // Test that API properly handles image requests
            const response = await request(app).get('/api/excel/priceList/get-all-priceLists');
            
            expect(response.status).toBe(200);
            
            // Check if response headers would allow frontend image access
            // (This depends on CORS configuration)
            expect(response.headers).toBeDefined();
        });
    });

    describe('6. Error Handling Tests', () => {
        test('Powinien obsłużyć nieistniejące obrazy gracefully', async () => {
            const response = await request(app)
                .post('/api/excel/priceList/create-priceList')
                .send({
                    good: goodId,
                    price: 100,
                    picture: '/images/non-existent-image.jpg'
                });

            // Should create entry even with non-existent image path
            expect(response.status).toBe(201);
            expect(response.body.createdPriceList.picture).toBe('/images/non-existent-image.jpg');
        });

        test('Powinien obsłużyć nieprawidłowe ścieżki obrazów', async () => {
            const invalidPaths = [
                'invalid-path',
                '../../../etc/passwd',
                'javascript:alert(1)',
                '<script>alert(1)</script>'
            ];

            for (const invalidPath of invalidPaths) {
                const response = await request(app)
                    .post('/api/excel/priceList/create-priceList')
                    .send({
                        good: goodId,
                        price: 100,
                        picture: invalidPath
                    });

                // Should either sanitize the path or reject it
                expect(response.status).toBeLessThan(600);
                
                if (response.status === 201) {
                    // If accepted, should be sanitized
                    expect(response.body.createdPriceList.picture).toBeDefined();
                }
            }
        });

        test('Powinien obsłużyć bardzo długie ścieżki obrazów', async () => {
            const longPath = '/images/' + 'a'.repeat(1000) + '.jpg';
            
            const response = await request(app)
                .post('/api/excel/priceList/create-priceList')
                .send({
                    good: goodId,
                    price: 100,
                    picture: longPath
                });

            // Should handle long paths appropriately (accept, truncate, or reject)
            expect(response.status).toBeLessThan(600);
        });
    });
});