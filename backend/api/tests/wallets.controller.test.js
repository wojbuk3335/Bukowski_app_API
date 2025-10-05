const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Import tylko kontroler bez serwera
const transferProcessingController = require('../app/controllers/transferProcessing');

// Import models
const User = require('../app/db/models/user');
const Goods = require('../app/db/models/goods');
const Size = require('../app/db/models/size');
const Color = require('../app/db/models/color');
const State = require('../app/db/models/state');
const Transfer = require('../app/db/models/transfer');
const History = require('../app/db/models/history');
const Sales = require('../app/db/models/sales');

let mongoServer;

describe('Wallets TransferProcessing Controller Tests', () => {
    let testUser, warehouseUser, testWallet, testSize, testColor, walletStateItem, walletTransfer;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);
    });

    afterAll(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        // Clear all collections
        await User.deleteMany({});
        await Goods.deleteMany({});
        await Size.deleteMany({});
        await Color.deleteMany({});
        await State.deleteMany({});
        await Transfer.deleteMany({});
        await History.deleteMany({});
        await Sales.deleteMany({});

        // Create test color
        testColor = await Color.create({
            _id: new mongoose.Types.ObjectId(),
            Kol_Kod: 'CZARNA',
            Kol_Opis: 'Czarna'
        });

        // Create test users
        testUser = await User.create({
            _id: new mongoose.Types.ObjectId(),
            email: 'wallet.user@test.com',
            password: 'password123',
            symbol: 'P',
            sellingPoint: 'P', // Dodane wymagane pole
            location: 'Punkt P',
            role: 'user'
        });

        warehouseUser = await User.create({
            _id: new mongoose.Types.ObjectId(),
            email: 'warehouse@test.com',
            password: 'password123',
            symbol: 'MAGAZYN',
            sellingPoint: null, // Dla magazynu może być null
            role: 'magazyn'
        });

        // Create wallet product
        testWallet = await Goods.create({
            _id: new mongoose.Types.ObjectId(),
            code: 'WALLET_001',
            fullName: 'Test Leather Wallet',
            price: 150,
            category: 'Portfele',
            color: testColor._id // Dodane wymagane pole
        });

        // Create size for wallet
        testSize = await Size.create({
            _id: new mongoose.Types.ObjectId(),
            Roz_Kod: 'PORTFEL',
            Roz_Opis: 'Rozmiar portfela'
        });

        // Create wallet in user state
        walletStateItem = await State.create({
            _id: new mongoose.Types.ObjectId(),
            fullName: testWallet._id,
            size: testSize._id,
            sellingPoint: testUser._id,
            price: 150,
            barcode: 'WALLET_BARCODE_001',
            date: new Date()
        });

        // Create wallet transfer
        walletTransfer = await Transfer.create({
            _id: new mongoose.Types.ObjectId(),
            fullName: testWallet.fullName,
            size: testSize.Roz_Kod,
            productId: walletStateItem._id.toString(),
            transfer_from: 'P',
            transfer_to: 'T',
            date: new Date(),
            dateString: new Date().toISOString().split('T')[0],
            processed: false
        });

        console.log('✅ Test setup completed');
    });

    describe('1. Transfer Processing for Wallets', () => {
        it('Powinien przetworzyć transfer portfela (processAllTransfers)', async () => {
            const req = {
                body: {
                    transfers: [{
                        _id: walletTransfer._id,
                        productId: walletStateItem._id,
                        transfer_from: 'P',
                        transfer_to: 'T'
                    }],
                    transactionId: 'test_wallet_transfer_001'
                },
                user: { _id: testUser._id }
            };

            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            await transferProcessingController.processAllTransfers(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    processedCount: 1,
                    transactionId: 'test_wallet_transfer_001'
                })
            );

            // Sprawdź czy portfel został usunięty ze stanu
            const stateAfter = await State.findById(walletStateItem._id);
            expect(stateAfter).toBeNull();

            // Sprawdź czy transfer został oznaczony jako przetworzony
            const transferAfter = await Transfer.findById(walletTransfer._id);
            expect(transferAfter.processed).toBe(true);

            // Sprawdź historię
            const historyEntry = await History.findOne({ transactionId: 'test_wallet_transfer_001' });
            expect(historyEntry).toBeTruthy();
            expect(historyEntry.operation).toBe('Odpisano ze stanu (transfer)');

            console.log('✅ Transfer portfela przetworzony pomyślnie');
        });

        it('Powinien przetworzyć pojedynczy transfer portfela (processSingleTransfer)', async () => {
            const req = {
                body: { transferId: walletTransfer._id },
                user: { _id: testUser._id }
            };

            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            await transferProcessingController.processSingleTransfer(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Transfer processed successfully',
                    removedItem: expect.objectContaining({
                        fullName: testWallet.fullName
                    })
                })
            );

            console.log('✅ Pojedynczy transfer portfela przetworzony');
        });
    });

    describe('2. Sales Processing for Wallets', () => {
        it('Powinien przetworzyć sprzedaż portfela (processSalesItems)', async () => {
            const req = {
                body: {
                    salesItems: [{
                        _id: new mongoose.Types.ObjectId(),
                        fullName: testWallet.fullName,
                        barcode: 'WALLET_BARCODE_001',
                        from: 'P'
                    }],
                    transactionId: 'test_wallet_sale_001'
                },
                user: { _id: testUser._id }
            };

            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            await transferProcessingController.processSalesItems(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    processedCount: 1
                })
            );

            // Sprawdź czy portfel został usunięty ze stanu
            const stateAfter = await State.findById(walletStateItem._id);
            expect(stateAfter).toBeNull();

            // Sprawdź historię sprzedaży
            const historyEntry = await History.findOne({ transactionId: 'test_wallet_sale_001' });
            expect(historyEntry).toBeTruthy();
            expect(historyEntry.operation).toBe('Odpisano ze stanu (sprzedaż)');

            console.log('✅ Sprzedaż portfela przetworzona pomyślnie');
        });

        it('Powinien obsłużyć zwrot portfela do magazynu', async () => {
            const req = {
                body: {
                    salesItems: [{
                        _id: new mongoose.Types.ObjectId(),
                        fullName: testWallet.fullName,
                        barcode: 'WALLET_BARCODE_001',
                        from: 'P',
                        transferType: 'return',
                        transfer_to: 'WAREHOUSE'
                    }],
                    transactionId: 'test_wallet_return_001'
                },
                user: { _id: testUser._id }
            };

            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            await transferProcessingController.processSalesItems(req, res);

            expect(res.status).toHaveBeenCalledWith(200);

            // Sprawdź czy portfel został zwrócony do magazynu
            const returnedToWarehouse = await State.findOne({
                barcode: 'WALLET_BARCODE_001',
                sellingPoint: warehouseUser._id
            });
            expect(returnedToWarehouse).toBeTruthy();

            console.log('✅ Zwrot portfela do magazynu obsłużony');
        });
    });

    describe('3. Warehouse Processing for Wallets', () => {
        it('Powinien przenieść portfel z magazynu do punktu (processWarehouseItems)', async () => {
            // Najpierw stwórz portfel w magazynie
            const warehouseWallet = await State.create({
                _id: new mongoose.Types.ObjectId(),
                fullName: testWallet._id,
                size: null, // Dla portfeli size powinien być null
                sellingPoint: warehouseUser._id,
                price: 150,
                barcode: 'WAREHOUSE_WALLET_001',
                date: new Date()
            });

            const req = {
                body: {
                    warehouseItems: [{
                        _id: warehouseWallet._id,
                        fullName: testWallet.fullName,
                        size: 'Portfel', // Dla portfeli rozmiar nie ma znaczenia, ale podajmy coś
                        barcode: 'WAREHOUSE_WALLET_001',
                        transfer_to: 'P',
                        price: 150
                    }],
                    transactionId: 'test_warehouse_wallet_001'
                },
                user: { _id: testUser._id }
            };

            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            await transferProcessingController.processWarehouseItems(req, res);

            console.log('Response status:', res.status.mock.calls);
            console.log('Response json:', res.json.mock.calls);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    processedCount: 1
                })
            );

            // Sprawdź czy portfel został przeniesiony do użytkownika
            // Dla portfeli kontroler używa goods.code zamiast item.barcode
            const userState = await State.findOne({
                sellingPoint: testUser._id,
                barcode: 'WALLET_001' // Kontroler używa goods.code dla portfeli
            });
            
            console.log('Looking for wallet with barcode: WALLET_001 (goods.code), user:', testUser._id);
            console.log('Found userState:', userState);
            
            // Sprawdź wszystkie stany użytkownika
            const allUserStates = await State.find({ sellingPoint: testUser._id });
            console.log('All user states:', allUserStates);
            
            expect(userState).toBeTruthy();

            console.log('✅ Przeniesienie portfela z magazynu zakończone sukcesem');
        });
    });

    describe('4. Transaction History and Undo for Wallets', () => {
        it('Powinien pobrać ostatnią transakcję (getLastTransaction)', async () => {
            // Najpierw stwórz transakcję
            await History.create({
                collectionName: 'Stan',
                operation: 'Odpisano ze stanu (transfer)',
                product: `${testWallet.fullName} Portfel`,
                transactionId: 'test_wallet_history_001',
                timestamp: new Date(),
                from: 'P',
                to: 'T'
            });

            const req = {};
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            await transferProcessingController.getLastTransaction(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    transactionId: 'test_wallet_history_001',
                    canUndo: true
                })
            );

            console.log('✅ Pobieranie ostatniej transakcji działa');
        });

        it('Powinien cofnąć transakcję portfela (undoLastTransaction)', async () => {
            // Stwórz historię transferu do cofnięcia
            await History.create({
                collectionName: 'Stan',
                operation: 'Odpisano ze stanu (transfer)',
                product: `${testWallet.fullName} Portfel`,
                details: JSON.stringify({
                    originalId: walletStateItem._id,
                    fullName: testWallet._id,
                    fullNameText: testWallet.fullName,
                    size: testSize._id,
                    sizeText: testSize.Roz_Opis,
                    barcode: 'WALLET_BARCODE_001',
                    sellingPoint: testUser._id,
                    sellingPointSymbol: 'P',
                    price: 150,
                    transferId: walletTransfer._id
                }),
                transactionId: 'test_wallet_undo_001',
                timestamp: new Date(),
                from: 'P',
                to: 'T'
            });

            // Usuń portfel ze stanu (symuluj że został przetworzony)
            await State.findByIdAndDelete(walletStateItem._id);

            const req = {};
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            await transferProcessingController.undoLastTransaction(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    restoredCount: expect.any(Number)
                })
            );

            // Sprawdź czy portfel został przywrócony do stanu
            const restoredState = await State.findById(walletStateItem._id);
            expect(restoredState).toBeTruthy();

            // Sprawdź czy transfer został oznaczony jako nieprzetworzony
            const transferAfterUndo = await Transfer.findById(walletTransfer._id);
            expect(transferAfterUndo.processed).toBe(false);

            console.log('✅ Cofanie transakcji portfela działa');
        });
    });

    describe('5. Error Handling for Wallets', () => {
        it('Powinien obsłużyć błąd braku transferów', async () => {
            const req = {
                body: { transfers: [] },
                user: { _id: testUser._id }
            };

            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            await transferProcessingController.processAllTransfers(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'No transfers provided for processing'
                })
            );

            console.log('✅ Obsługa błędu braku transferów działa');
        });

        it('Powinien obsłużyć błąd nieistniejącego portfela', async () => {
            const req = {
                body: {
                    salesItems: [{
                        _id: new mongoose.Types.ObjectId(),
                        fullName: 'Nieistniejący Portfel',
                        barcode: 'NIEISTNIEJACY_BARCODE',
                        from: 'P'
                    }]
                },
                user: { _id: testUser._id }
            };

            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            await transferProcessingController.processSalesItems(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            
            const responseCall = res.json.mock.calls[0][0];
            expect(responseCall.errors).toBeTruthy();
            expect(responseCall.processedCount).toBe(0);

            console.log('✅ Obsługa błędu nieistniejącego portfela działa');
        });
    });

    describe('6. Wallets Category Specific Logic', () => {
        it('Powinien poprawnie obsłużyć kategorię Portfele (bez rozmiaru)', async () => {
            // Test specjalnej logiki dla kategorii 'Portfele'
            const walletWithoutSize = await State.create({
                _id: new mongoose.Types.ObjectId(),
                fullName: testWallet._id,
                size: null, // Portfele mogą nie mieć rozmiaru
                sellingPoint: testUser._id,
                price: 150,
                barcode: 'WALLET_NO_SIZE_001',
                date: new Date()
            });

            const req = {
                body: {
                    salesItems: [{
                        _id: new mongoose.Types.ObjectId(),
                        fullName: testWallet.fullName,
                        barcode: 'WALLET_NO_SIZE_001',
                        from: 'P'
                    }]
                },
                user: { _id: testUser._id }
            };

            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            await transferProcessingController.processSalesItems(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            
            const responseCall = res.json.mock.calls[0][0];
            expect(responseCall.processedCount).toBe(1);

            // Sprawdź czy historia zawiera '-' dla rozmiaru
            const historyEntry = await History.findOne({
                transactionId: responseCall.transactionId
            });
            expect(historyEntry.product).toContain('-');

            console.log('✅ Specjalna logika dla kategorii Portfele działa');
        });
    });
});