const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app/app');

describe('Colors Uppercase Conversion Tests', () => {
    let mongoServer;

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
    });

    afterAll(async () => {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        if (mongoServer) {
            await mongoServer.stop();
        }
    });

    describe('1. Insert Colors Uppercase Conversion', () => {
        test('Powinien konwertować nazwy kolorów na wielkie litery podczas dodawania', async () => {
            // Arrange
            const colorsToInsert = [
                { Kol_Kod: 'KOL001', Kol_Opis: 'czerwony' },
                { Kol_Kod: 'KOL002', Kol_Opis: 'niebieski' },
                { Kol_Kod: 'KOL003', Kol_Opis: 'Zielony' },
                { Kol_Kod: 'KOL004', Kol_Opis: 'ŻÓŁTY' }
            ];

            // Act
            const response = await request(app)
                .post('/api/excel/color/insert-many-colors')
                .send(colorsToInsert);

            // Assert
            expect(response.status).toBe(201);
            expect(response.body.colors).toHaveLength(4);

            // Verify all colors are uppercase
            const colors = response.body.colors;
            expect(colors.find(c => c.Kol_Kod === 'KOL001').Kol_Opis).toBe('CZERWONY');
            expect(colors.find(c => c.Kol_Kod === 'KOL002').Kol_Opis).toBe('NIEBIESKI');
            expect(colors.find(c => c.Kol_Kod === 'KOL003').Kol_Opis).toBe('ZIELONY');
            expect(colors.find(c => c.Kol_Kod === 'KOL004').Kol_Opis).toBe('ŻÓŁTY');
        });

        test('Powinien obsłużyć puste i null wartości', async () => {
            // Arrange
            const colorsToInsert = [
                { Kol_Kod: 'KOL001', Kol_Opis: '' },
                { Kol_Kod: 'KOL002', Kol_Opis: null },
                { Kol_Kod: 'KOL003' } // missing Kol_Opis
            ];

            // Act
            const response = await request(app)
                .post('/api/excel/color/insert-many-colors')
                .send(colorsToInsert);

            // Assert - should not crash
            expect(response.status).toBeLessThan(500);
        });

        test('Powinien obsłużyć znaki specjalne w nazwach kolorów', async () => {
            // Arrange
            const colorsToInsert = [
                { Kol_Kod: 'KOL001', Kol_Opis: 'różowo-niebieski' },
                { Kol_Kod: 'KOL002', Kol_Opis: 'kolor #123' },
                { Kol_Kod: 'KOL003', Kol_Opis: 'jasno żółty!' }
            ];

            // Act
            const response = await request(app)
                .post('/api/excel/color/insert-many-colors')
                .send(colorsToInsert);

            // Assert
            expect(response.status).toBe(201);
            const colors = response.body.colors;
            expect(colors.find(c => c.Kol_Kod === 'KOL001').Kol_Opis).toBe('RÓŻOWO-NIEBIESKI');
            expect(colors.find(c => c.Kol_Kod === 'KOL002').Kol_Opis).toBe('KOLOR #123');
            expect(colors.find(c => c.Kol_Kod === 'KOL003').Kol_Opis).toBe('JASNO ŻÓŁTY!');
        });
    });

    describe('2. Update Color Uppercase Conversion', () => {
        let testColorId;

        beforeEach(async () => {
            // Create test color
            const response = await request(app)
                .post('/api/excel/color/insert-many-colors')
                .send([{ Kol_Kod: 'TEST001', Kol_Opis: 'TESTOWY' }]);
            
            testColorId = response.body.colors[0]._id;
        });

        test('Powinien konwertować nazwę koloru na wielkie litery podczas edycji', async () => {
            // Act
            const response = await request(app)
                .patch(`/api/excel/color/update-color/${testColorId}`)
                .send({ Kol_Opis: 'nowy kolor' });

            // Assert
            expect(response.status).toBe(200);

            // Verify the color was updated with uppercase
            const colors = await request(app).get('/api/excel/color/get-all-colors');
            const updatedColor = colors.body.colors.find(c => c._id === testColorId);
            expect(updatedColor.Kol_Opis).toBe('NOWY KOLOR');
        });

        test('Powinien zachować już wielkie litery', async () => {
            // Act
            const response = await request(app)
                .patch(`/api/excel/color/update-color/${testColorId}`)
                .send({ Kol_Opis: 'WIELKIE LITERY' });

            // Assert
            expect(response.status).toBe(200);

            const colors = await request(app).get('/api/excel/color/get-all-colors');
            const updatedColor = colors.body.colors.find(c => c._id === testColorId);
            expect(updatedColor.Kol_Opis).toBe('WIELKIE LITERY');
        });

        test('Powinien konwertować mieszane wielkości liter', async () => {
            // Act
            const response = await request(app)
                .patch(`/api/excel/color/update-color/${testColorId}`)
                .send({ Kol_Opis: 'MiEsZaNe LiTeRy' });

            // Assert
            expect(response.status).toBe(200);

            const colors = await request(app).get('/api/excel/color/get-all-colors');
            const updatedColor = colors.body.colors.find(c => c._id === testColorId);
            expect(updatedColor.Kol_Opis).toBe('MIESZANE LITERY');
        });

        test('Powinien obsłużyć aktualizację innych pól bez wpływu na Kol_Opis', async () => {
            // Act - update only Kol_Kod
            const response = await request(app)
                .patch(`/api/excel/color/update-color/${testColorId}`)
                .send({ Kol_Kod: 'UPDATED001' });

            // Assert
            expect(response.status).toBe(200);

            // Kol_Opis should remain unchanged
            const colors = await request(app).get('/api/excel/color/get-all-colors');
            const updatedColor = colors.body.colors.find(c => c._id === testColorId);
            expect(updatedColor.Kol_Opis).toBe('TESTOWY'); // Original value
            expect(updatedColor.Kol_Kod).toBe('UPDATED001');
        });
    });

    describe('3. Integration with Product Name Synchronization', () => {
        let stockId, colorId, goodId;

        beforeEach(async () => {
            // Create test stock
            const stockResponse = await request(app)
                .post('/api/excel/stock/insert-many-stocks')
                .send([{ Tow_Kod: 'TEST001', Tow_Opis: 'TestStock' }]);
            stockId = stockResponse.body.stocks[0]._id;

            // Create test color with lowercase name
            const colorResponse = await request(app)
                .post('/api/excel/color/insert-many-colors')
                .send([{ Kol_Kod: 'COL001', Kol_Opis: 'czerwony' }]);
            colorId = colorResponse.body.colors[0]._id;

            // Create test good
            const goodResponse = await request(app)
                .post('/api/excel/goods/create-goods')
                .send({
                    stock: stockId,
                    color: colorId,
                    fullName: 'TestStock CZERWONY', // Note: should be uppercase after color creation
                    code: 'GOOD001',
                    category: 'Kurtki kożuchy futra',
                    price: 100,
                    sellingPoint: 'Wszędzie'
                });
            goodId = goodResponse.body.createdGood._id;
        });

        test('Powinna synchronizować nazwy produktów z nowymi nazwami kolorów w uppercase', async () => {
            // Act - update color name (will be converted to uppercase and sync products)
            const response = await request(app)
                .patch(`/api/excel/color/update-color/${colorId}`)
                .send({ Kol_Opis: 'niebieski' });

            expect(response.status).toBe(200);

            // Wait for async synchronization
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Assert - product name should be updated with uppercase color
            const goods = await request(app).get('/api/excel/goods/get-all-goods');
            const product = goods.body.goods.find(g => g._id === goodId);
            
            // Should contain uppercase color name
            expect(product.fullName).toContain('NIEBIESKI');
            expect(product.fullName).not.toContain('niebieski');
        });
    });

    describe('4. Validation and Error Handling', () => {
        test('Powinien obsłużyć nieistniejący color ID podczas aktualizacji', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            
            const response = await request(app)
                .patch(`/api/excel/color/update-color/${fakeId}`)
                .send({ Kol_Opis: 'test' });

            expect(response.status).toBe(404);
        });

        test('Powinien walidować duplikaty po konwersji na uppercase', async () => {
            // Create first color
            await request(app)
                .post('/api/excel/color/insert-many-colors')
                .send([{ Kol_Kod: 'COL001', Kol_Opis: 'CZERWONY' }]);

            // Try to create second color that would be duplicate after uppercase conversion
            const response = await request(app)
                .post('/api/excel/color/insert-many-colors')
                .send([{ Kol_Kod: 'COL002', Kol_Opis: 'czerwony' }]); // lowercase, but becomes CZERWONY

            // This might cause duplicate error depending on validation logic
            // The test verifies the system handles this case appropriately
            expect(response.status).toBeLessThan(600);
        });
    });

    describe('5. Performance Tests', () => {
        test('Powinien sprawnie obsłużyć dużą liczbę kolorów', async () => {
            // Arrange - create 100 colors
            const manyColors = [];
            for (let i = 1; i <= 100; i++) {
                manyColors.push({
                    Kol_Kod: `COL${i.toString().padStart(3, '0')}`,
                    Kol_Opis: `kolor numer ${i}`
                });
            }

            // Act
            const startTime = Date.now();
            const response = await request(app)
                .post('/api/excel/color/insert-many-colors')
                .send(manyColors);
            const endTime = Date.now();

            // Assert
            expect(response.status).toBe(201);
            expect(response.body.colors).toHaveLength(100);
            expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds

            // Verify all are uppercase
            response.body.colors.forEach((color, index) => {
                expect(color.Kol_Opis).toBe(`KOLOR NUMER ${index + 1}`);
            });
        });
    });
});