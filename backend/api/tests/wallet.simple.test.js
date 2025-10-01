const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Wallet = require('../app/db/models/wallet');
const walletController = require('../app/controllers/wallet');

// Create a minimal Express app for testing
const express = require('express');
const app = express();
app.use(express.json({ limit: '50mb' }));

// Create routes manually for testing
app.get('/api/excel/wallet/get-all-wallets', walletController.getAllWallets);
app.post('/api/excel/wallet/insert-many-wallets', walletController.insertManyWallets);
app.patch('/api/excel/wallet/update-wallet/:id', walletController.updateWallet);
app.delete('/api/excel/wallet/delete-wallet/:id', walletController.deleteWallet);
app.delete('/api/excel/wallet/delete-all-wallets', walletController.deleteAllWallets);

describe('Wallet API Tests', () => {
    let mongoServer;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });
    
    beforeEach(async () => {
        // Clear wallet collection before each test
        await Wallet.deleteMany({});
    });

    describe('GET /api/excel/wallet/get-all-wallets', () => {
        test('1. Powinien zwrócić pustą listę torebek gdy baza jest pusta', async () => {
            const response = await request(app)
                .get('/api/excel/wallet/get-all-wallets')
                .expect(200);

            expect(response.body).toHaveProperty('wallets');
            expect(response.body.wallets).toEqual([]);
        });

        test('2. Powinien zwrócić wszystkie torebki z bazy danych', async () => {
            // Arrange - dodaj test data
            const testWallets = [
                { _id: new mongoose.Types.ObjectId(), Torebki_Nr: 1, Torebki_Kod: 'TEST001' },
                { _id: new mongoose.Types.ObjectId(), Torebki_Nr: 2, Torebki_Kod: 'TEST002' }
            ];
            await Wallet.insertMany(testWallets);

            // Act
            const response = await request(app)
                .get('/api/excel/wallet/get-all-wallets')
                .expect(200);

            // Assert
            expect(response.body).toHaveProperty('wallets');
            expect(response.body.wallets).toHaveLength(2);
            expect(response.body.wallets[0]).toHaveProperty('Torebki_Nr', 1);
            expect(response.body.wallets[1]).toHaveProperty('Torebki_Nr', 2);
        });
    });

    describe('POST /api/excel/wallet/insert-many-wallets', () => {
        test('3. Powinien dodać nowe torebki do bazy danych', async () => {
            // Arrange
            const newWallets = [
                { Torebki_Nr: 1, Torebki_Kod: 'INSERT001' },
                { Torebki_Nr: 2, Torebki_Kod: 'INSERT002' }
            ];

            // Act
            const response = await request(app)
                .post('/api/excel/wallet/insert-many-wallets')
                .send(newWallets)
                .expect(201);

            // Assert
            expect(response.body).toHaveProperty('message', 'Wallets inserted successfully');
            expect(response.body).toHaveProperty('wallets');
            expect(response.body.wallets).toHaveLength(2);

            // Verify in database
            const walletsInDb = await Wallet.find({});
            expect(walletsInDb).toHaveLength(2);
        });

        test('4. Nie powinien dodać torebki z duplikujący numerem', async () => {
            // Arrange - dodaj istniejącą torebkę
            await Wallet.create({ _id: new mongoose.Types.ObjectId(), Torebki_Nr: 1, Torebki_Kod: 'EXISTING' });

            const duplicateWallet = [
                { Torebki_Nr: 1, Torebki_Kod: 'DUPLICATE' }
            ];

            // Act & Assert
            const response = await request(app)
                .post('/api/excel/wallet/insert-many-wallets')
                .send(duplicateWallet)
                .expect(400);

            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toContain('already exists');
        });
    });

    describe('PATCH /api/excel/wallet/update-wallet/:id', () => {
        test('5. Powinien zaktualizować istniejącą torebkę', async () => {
            // Arrange
            const wallet = await Wallet.create({ 
                _id: new mongoose.Types.ObjectId(), 
                Torebki_Nr: 1, 
                Torebki_Kod: 'BEFORE_UPDATE' 
            });

            const updateData = {
                Torebki_Nr: 1,
                Torebki_Kod: 'AFTER_UPDATE'
            };

            // Act
            const response = await request(app)
                .patch(`/api/excel/wallet/update-wallet/${wallet._id}`)
                .send(updateData)
                .expect(200);

            // Assert
            expect(response.body).toHaveProperty('message', 'Wallet updated successfully');
            expect(response.body.wallet).toHaveProperty('Torebki_Kod', 'AFTER_UPDATE');

            // Verify in database
            const updatedWallet = await Wallet.findById(wallet._id);
            expect(updatedWallet.Torebki_Kod).toBe('AFTER_UPDATE');
        });

        test('6. Nie powinien zaktualizować nieistniejącej torebki', async () => {
            // Arrange
            const nonExistentId = new mongoose.Types.ObjectId();
            const updateData = { Torebki_Nr: 999, Torebki_Kod: 'NOT_FOUND' };

            // Act & Assert
            const response = await request(app)
                .patch(`/api/excel/wallet/update-wallet/${nonExistentId}`)
                .send(updateData)
                .expect(404);

            expect(response.body).toHaveProperty('message', 'Wallet not found');
        });
    });

    describe('DELETE /api/excel/wallet/delete-wallet/:id', () => {
        test('7. Powinien usunąć torebkę z bazy danych', async () => {
            // Arrange
            const wallet = await Wallet.create({ 
                _id: new mongoose.Types.ObjectId(), 
                Torebki_Nr: 1, 
                Torebki_Kod: 'TO_DELETE' 
            });

            // Act
            const response = await request(app)
                .delete(`/api/excel/wallet/delete-wallet/${wallet._id}`)
                .expect(200);

            // Assert
            expect(response.body).toHaveProperty('message', 'Wallet deleted successfully');

            // Verify in database
            const deletedWallet = await Wallet.findById(wallet._id);
            expect(deletedWallet).toBeNull();
        });
    });

    describe('DELETE /api/excel/wallet/delete-all-wallets', () => {
        test('8. Powinien usunąć wszystkie torebki z bazy danych', async () => {
            // Arrange - dodaj kilka torebek
            const testWallets = [
                { _id: new mongoose.Types.ObjectId(), Torebki_Nr: 1, Torebki_Kod: 'DELETE_ALL_1' },
                { _id: new mongoose.Types.ObjectId(), Torebki_Nr: 2, Torebki_Kod: 'DELETE_ALL_2' },
                { _id: new mongoose.Types.ObjectId(), Torebki_Nr: 3, Torebki_Kod: 'DELETE_ALL_3' }
            ];
            await Wallet.insertMany(testWallets);

            // Act
            const response = await request(app)
                .delete('/api/excel/wallet/delete-all-wallets')
                .expect(200);

            // Assert
            expect(response.body).toHaveProperty('message', 'All wallets deleted successfully');
            expect(response.body).toHaveProperty('deletedCount', 3);

            // Verify in database
            const remainingWallets = await Wallet.find({});
            expect(remainingWallets).toHaveLength(0);
        });
    });

    describe('Data Validation Tests', () => {
        test('9. Powinien obsłużyć puste pole Torebki_Kod', async () => {
            // Arrange
            const walletWithEmptyCode = [
                { Torebki_Nr: 1, Torebki_Kod: '' }
            ];

            // Act
            const response = await request(app)
                .post('/api/excel/wallet/insert-many-wallets')
                .send(walletWithEmptyCode)
                .expect(201);

            // Assert
            expect(response.body.wallets[0]).toHaveProperty('Torebki_Kod', '');
        });

        test('10. Powinien obsłużyć różne typy numerów torebek', async () => {
            // Arrange
            const walletsWithDifferentNumbers = [
                { Torebki_Nr: 1, Torebki_Kod: 'NUM_1' },
                { Torebki_Nr: 2, Torebki_Kod: 'NUM_2' },
                { Torebki_Nr: 100, Torebki_Kod: 'NUM_100' }
            ];

            // Act
            const response = await request(app)
                .post('/api/excel/wallet/insert-many-wallets')
                .send(walletsWithDifferentNumbers)
                .expect(201);

            // Assert
            expect(response.body.wallets).toHaveLength(3);
            
            // Verify in database
            const walletsInDb = await Wallet.find({}).sort({ Torebki_Nr: 1 });
            expect(walletsInDb).toHaveLength(3);
            expect(walletsInDb[0].Torebki_Nr).toBe(1);
            expect(walletsInDb[1].Torebki_Nr).toBe(2);
            expect(walletsInDb[2].Torebki_Nr).toBe(100);
        });
    });
});