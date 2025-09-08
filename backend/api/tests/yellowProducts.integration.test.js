const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
// Import only the controller, not the entire app
const transferProcessingController = require('../app/controllers/transferProcessing');
const History = require('../app/db/models/history');
const Transfer = require('../app/db/models/transfer');
const State = require('../app/db/models/state');
const User = require('../app/db/models/user');
const Size = require('../app/db/models/size');
const Goods = require('../app/db/models/goods');
const Color = require('../app/db/models/color');
const Category = require('../app/db/models/category');
const Stock = require('../app/db/models/stock');
const LastTransaction = require('../app/db/models/lastTransaction');

// Create a minimal Express app for testing
const express = require('express');
const testApp = express();
testApp.use(express.json());

// Add routes
testApp.post('/api/transfer/process-warehouse', transferProcessingController.processWarehouseItems);
testApp.get('/api/transfer/last-transaction', transferProcessingController.getLastTransaction);
testApp.post('/api/transfer/undo-last', transferProcessingController.undoLastTransaction);

describe('Yellow Products (Incoming Transfers) Backend Tests', () => {
  let mongoServer;
  let mongoUri;
  let testUser, testColor, testStock, testCategory, testSize, testGoods;

  // Helper function do tworzenia User z wymaganymi polami
  const createTestUser = async (symbol = 'TestUser', role = 'user', extraData = {}) => {
    return await User.create({
      _id: new mongoose.Types.ObjectId(),
      email: `${symbol.toLowerCase()}@example.com`,
      password: 'testpassword123',
      symbol,
      role,
      sellingPoint: role === 'user' ? `Punkt ${symbol}` : null,
      location: role === 'user' ? 'Test Location' : null,
      ...extraData
    });
  };

  beforeAll(async () => {
    // Disconnect any existing connections
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Wyczyść kolekcje przed każdym testem
    await History.deleteMany({});
    await Transfer.deleteMany({});
    await State.deleteMany({});
    await User.deleteMany({});
    await Size.deleteMany({});
    await Goods.deleteMany({});
    await Color.deleteMany({});
    await Category.deleteMany({});
    await Stock.deleteMany({});
    await LastTransaction.deleteMany({});

    // Przygotuj dane testowe
    testUser = await createTestUser('TestUser');
    
    // Dodaj dodatkowych użytkowników dla testów
    await createTestUser('User2');
    await createTestUser('BatchUser');
    await createTestUser('WorkflowUser');
    await createTestUser('UndoUser');
    await createTestUser('MultiUser');
    await createTestUser('BrokenUser');

    // Stwórz color
    testColor = await Color.create({
      _id: new mongoose.Types.ObjectId(),
      Kol_Kod: 'YELLOW',
      Kol_Opis: 'Żółty kolor'
    });

    // Stwórz stock
    testStock = await Stock.create({
      _id: new mongoose.Types.ObjectId(),
      Tow_Kod: 'YELLOW_PROD',
      Tow_Opis: 'Żółty produkt'
    });

    // Stwórz category
    testCategory = await Category.create({
      _id: new mongoose.Types.ObjectId(),
      Kat_1_Kod_1: 'YELLOW_CAT',
      Kat_1_Nazwa_1: 'Żółta kategoria'
    });

    // Stwórz size
    testSize = await Size.create({
      _id: new mongoose.Types.ObjectId(),
      Roz_Kod: 'M',
      Roz_Opis: 'M'  // Controller szuka po Roz_Opis
    });

    // Stwórz goods
    testGoods = await Goods.create({
      _id: new mongoose.Types.ObjectId(),
      stock: testStock._id,
      color: testColor._id,
      fullName: 'Yellow Test Product',
      code: 'YELLOW_PROD_YELLOW',
      price: 100,
      category: 'YELLOW_ITEMS',
      subcategory: testCategory._id,
      Plec: 'UNISEX'
    });
  });

  describe('POST /api/transfer/process-warehouse - Yellow Products Processing', () => {
    test('1. Powinien przetworzyć żółty produkt (incoming transfer) i dodać do stanu', async () => {
      // Przygotuj transfer w bazie
      const testTransfer = await Transfer.create({
        fullName: 'Yellow Test Product',
        size: 'M',
        transfer_from: 'Punkt A',
        transfer_to: 'TestUser',
        date: new Date('2025-08-31'),
        dateString: '2025-08-31',
        productId: 'test_yellow_product_123',
        processed: false
      });

      const yellowProduct = {
        _id: testTransfer._id.toString(),
        fullName: 'Yellow Test Product',
        size: 'M',
        isIncomingTransfer: true,
        transfer_to: 'TestUser',
        transfer_from: 'Punkt A',
        barcode: null // Will be generated
      };

      const response = await request(testApp)
        .post('/api/transfer/process-warehouse')
        .send({
          warehouseItems: [yellowProduct],
          selectedDate: '2025-08-31',
          selectedUser: 'TestUser',
          transactionId: 'test_yellow_123',
          isIncomingTransfer: true  // DODANO: dla żółtych produktów
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Warehouse items processed successfully');
      expect(response.body.transactionId).toBe('test_yellow_123');
      expect(response.body.addedItems).toHaveLength(1);

      // Sprawdź czy element został dodany do stanu
      const stateItems = await State.find({}).populate('fullName').populate('sellingPoint');
      expect(stateItems).toHaveLength(1);
      expect(stateItems[0].fullName.fullName).toBe('Yellow Test Product');
      expect(stateItems[0].sellingPoint.symbol).toBe('TestUser');
      expect(stateItems[0].barcode).toMatch(/^INCOMING_/);

      // Sprawdź czy transfer został oznaczony jako przetworzony
      const updatedTransfer = await Transfer.findById(testTransfer._id);
      expect(updatedTransfer.processed).toBe(true);
      expect(updatedTransfer.processedAt).toBeDefined();

      // Sprawdź historię
      const historyEntries = await History.find({});
      expect(historyEntries).toHaveLength(1);
      expect(historyEntries[0].operation).toBe('Dodano do stanu (transfer przychodzący)');
      expect(historyEntries[0].transactionId).toBe('test_yellow_123');

      const historyDetails = JSON.parse(historyEntries[0].details);
      expect(historyDetails.isIncomingTransfer).toBe(true);
      expect(historyDetails.targetUser).toBe('TestUser');
      expect(historyDetails.transferId).toBe(testTransfer._id.toString());
    });

    test('2. Powinien wygenerować unikalny kod kreskowy dla żółtego produktu', async () => {
      const testTransfer = await Transfer.create({
        fullName: 'Yellow Test Product',  // Użyj tej samej nazwy co testGoods
        size: 'M',  // Użyj tego samego rozmiaru co testSize 
        transfer_from: 'Punkt B',
        transfer_to: 'User2',
        date: new Date('2025-08-31'),
        dateString: '2025-08-31',
        productId: 'unique_barcode_product_456',
        processed: false
      });

      const yellowProduct = {
        _id: testTransfer._id.toString(),
        fullName: 'Yellow Test Product',  // Użyj tej samej nazwy
        size: 'M',  // Użyj tego samego rozmiaru
        isIncomingTransfer: true,
        transfer_to: 'User2'
      };

      const response = await request(testApp)
        .post('/api/transfer/process-warehouse')
        .send({
          warehouseItems: [yellowProduct],
          selectedDate: '2025-08-31',
          selectedUser: 'User2',
          transactionId: 'barcode_test_456',
          isIncomingTransfer: true  // DODANO: dla żółtych produktów
        });

      expect(response.status).toBe(200);

      const stateItem = await State.findOne({});
      expect(stateItem.barcode).toMatch(/^INCOMING_\d+_[a-z0-9]+$/);
      expect(stateItem.barcode).toContain('INCOMING_');

      // Sprawdź czy kod kreskowy jest zapisany w historii
      const historyEntry = await History.findOne({});
      const details = JSON.parse(historyEntry.details);
      expect(details.barcode).toBe(stateItem.barcode);
    });

    test('3. Powinien obsłużyć wiele żółtych produktów w jednej transakcji', async () => {
      // Przygotuj wiele transferów
      const transfer1 = await Transfer.create({
        fullName: 'Yellow Test Product',  // Użyj tej samej nazwy
        size: 'M',  // Użyj tego samego rozmiaru
        transfer_from: 'Punkt A',
        transfer_to: 'BatchUser',
        date: new Date('2025-08-31'),
        dateString: '2025-08-31',
        productId: 'yellow_product_1_batch',
        processed: false
      });

      const transfer2 = await Transfer.create({
        fullName: 'Yellow Test Product',  // Użyj tej samej nazwy  
        size: 'M',  // Użyj tego samego rozmiaru
        transfer_from: 'Punkt B',
        transfer_to: 'BatchUser',
        date: new Date('2025-08-31'),
        dateString: '2025-08-31',
        productId: 'yellow_product_2_batch',
        processed: false
      });

      const yellowProducts = [
        {
          _id: transfer1._id.toString(),
          fullName: 'Yellow Test Product',  // Użyj tej samej nazwy
          size: 'M',  // Użyj tego samego rozmiaru
          isIncomingTransfer: true,
          transfer_to: 'BatchUser'
        },
        {
          _id: transfer2._id.toString(),
          fullName: 'Yellow Test Product',  // Użyj tej samej nazwy
          size: 'M',  // Użyj tego samego rozmiaru
          isIncomingTransfer: true,
          transfer_to: 'BatchUser'
        }
      ];

      const response = await request(testApp)
        .post('/api/transfer/process-warehouse')
        .send({
          warehouseItems: yellowProducts,
          selectedDate: '2025-08-31',
          selectedUser: 'BatchUser',
          transactionId: 'batch_test_789',
          isIncomingTransfer: true  // DODANO: dla żółtych produktów
        });

      expect(response.status).toBe(200);
      expect(response.body.addedItems).toHaveLength(2);

      // Sprawdź stan
      const stateItems = await State.find({}).populate('sellingPoint');
      expect(stateItems).toHaveLength(2);
      expect(stateItems.every(item => item.sellingPoint.symbol === 'BatchUser')).toBe(true);

      // Sprawdź historię
      const historyEntries = await History.find({});
      expect(historyEntries).toHaveLength(2);
      expect(historyEntries.every(entry => entry.operation === 'Dodano do stanu (transfer przychodzący)')).toBe(true);
      expect(historyEntries.every(entry => entry.transactionId === 'batch_test_789')).toBe(true);
    });

    test('4. Powinien obsłużyć błąd gdy transfer nie istnieje', async () => {
      const nonExistentYellowProduct = {
        _id: new mongoose.Types.ObjectId().toString(),
        fullName: 'Non-existent Product',
        size: 'L',
        isIncomingTransfer: true,
        transfer_to: 'TestUser'
      };

      const response = await request(testApp)
        .post('/api/transfer/process-warehouse')
        .send({
          warehouseItems: [nonExistentYellowProduct],
          selectedDate: '2025-08-31',
          selectedUser: 'TestUser',
          transactionId: 'error_test_999'
        });

      expect(response.status).toBe(200);
      expect(response.body.errors[0]).toContain('Product or size not found');

      // Sprawdź czy nic nie zostało dodane
      const stateItems = await State.find({});
      expect(stateItems).toHaveLength(0);

      const historyEntries = await History.find({});
      expect(historyEntries).toHaveLength(0);
    });
  });

  describe('GET /api/transfer/last-transaction - Yellow Products Support', () => {
    test('5. Powinien rozpoznać żółte produkty jako ostatnią transakcję', async () => {
      // Utwórz historię z żółtymi produktami
      await History.create({
        collectionName: 'State',
        operation: 'Dodano do stanu (transfer przychodzący)',
        transactionId: 'yellow_transaction_123',
        timestamp: new Date(),
        product: 'Yellow Test Product',
        details: JSON.stringify({
          stateId: new mongoose.Types.ObjectId(),
          transferId: new mongoose.Types.ObjectId(),
          isIncomingTransfer: true,
          targetUser: 'TestUser'
        })
      });

      const response = await request(testApp)
        .get('/api/transfer/last-transaction');

      expect(response.status).toBe(200);
      expect(response.body.transactionId).toBe('yellow_transaction_123');
      expect(response.body.canUndo).toBe(true);
      expect(response.body.transactionType).toBe('incoming');
      expect(response.body.itemCount).toBe(1);
    });

    test('6. Powinien prawidłowo liczyć elementy w transakcji żółtych produktów', async () => {
      const transactionId = 'multi_yellow_456';

      // Utwórz wiele wpisów historii dla tej samej transakcji
      await History.create([
        {
          collectionName: 'State',
          operation: 'Dodano do stanu (transfer przychodzący)',
          transactionId,
          timestamp: new Date(),
          product: 'Yellow Product 1'
        },
        {
          collectionName: 'State',
          operation: 'Dodano do stanu (transfer przychodzący)',
          transactionId,
          timestamp: new Date(),
          product: 'Yellow Product 2'
        },
        {
          collectionName: 'State',
          operation: 'Dodano do stanu (transfer przychodzący)',
          transactionId,
          timestamp: new Date(),
          product: 'Yellow Product 3'
        }
      ]);

      const response = await request(testApp)
        .get('/api/transfer/last-transaction');

      expect(response.status).toBe(200);
      expect(response.body.transactionId).toBe(transactionId);
      expect(response.body.itemCount).toBe(3);
      expect(response.body.transactionType).toBe('incoming');
    });

    test('7. Powinien preferować nowszą transakcję żółtych produktów', async () => {
      const olderDate = new Date('2025-08-30T10:00:00Z');
      const newerDate = new Date('2025-08-31T15:00:00Z');

      // Starsza transakcja
      await History.create({
        collectionName: 'State',
        operation: 'Dodano do stanu (transfer przychodzący)',
        transactionId: 'older_yellow_123',
        timestamp: olderDate,
        product: 'Older Yellow Product'
      });

      // Nowsza transakcja
      await History.create({
        collectionName: 'State',
        operation: 'Dodano do stanu (transfer przychodzący)',
        transactionId: 'newer_yellow_456',
        timestamp: newerDate,
        product: 'Newer Yellow Product'
      });

      const response = await request(testApp)
        .get('/api/transfer/last-transaction');

      expect(response.status).toBe(200);
      expect(response.body.transactionId).toBe('newer_yellow_456');
    });
  });

  describe('POST /api/transfer/undo-last - Yellow Products Undo', () => {
    test('8. Powinien cofnąć transakcję żółtych produktów', async () => {
      // Przygotuj transfer i stan
      const testTransfer = await Transfer.create({
        fullName: 'Yellow Test Product',  // Użyj tej samej nazwy
        size: 'M',  // Użyj tego samego rozmiaru
        transfer_from: 'Source',
        transfer_to: 'UndoUser',
        date: new Date('2025-08-31'),
        dateString: '2025-08-31',
        productId: 'undo_test_product_xl',
        processed: true,
        processedAt: new Date()
      });

      const stateItem = await State.create({
        _id: new mongoose.Types.ObjectId(),
        fullName: testGoods._id,
        size: testSize._id,
        sellingPoint: testUser._id,
        date: new Date(),
        barcode: 'INCOMING_12345_abc',
        price: 200
      });

      // Utwórz historię
      await History.create({
        collectionName: 'State',
        operation: 'Dodano do stanu (transfer przychodzący)',
        transactionId: 'undo_test_789',
        timestamp: new Date(),
        product: 'Undo Test Product',
        details: JSON.stringify({
          stateId: stateItem._id,
          transferId: testTransfer._id,
          isIncomingTransfer: true,
          targetUser: 'UndoUser',
          barcode: 'INCOMING_12345_abc'
        })
      });

      // Utwórz LastTransaction
      await LastTransaction.create({
        transactionId: 'undo_test_789',
        operationType: 'incoming_transfer',
        transactionType: 'incoming',
        itemCount: 1,
        timestamp: new Date()
      });

      const response = await request(testApp)
        .post('/api/transfer/undo-last');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Transaction successfully undone (history cleaned)');
      expect(response.body.transactionId).toBe('undo_test_789');
      expect(response.body.restoredCount).toBe(1);

      // Sprawdź czy element został usunięty ze stanu
      const remainingStateItems = await State.find({});
      expect(remainingStateItems).toHaveLength(0);

      // Sprawdź czy transfer został przywrócony do nieprzetworzonego
      const restoredTransfer = await Transfer.findById(testTransfer._id);
      expect(restoredTransfer.processed).toBe(false);
      expect(restoredTransfer.processedAt).toBeNull();

      // Sprawdź czy historia została wyczyszczona
      const remainingHistory = await History.find({});
      expect(remainingHistory).toHaveLength(0);

      // Sprawdź czy LastTransaction została usunięta
      const remainingLastTransaction = await LastTransaction.find({});
      expect(remainingLastTransaction).toHaveLength(0);
    });

    test('9. Powinien obsłużyć cofanie wielu żółtych produktów', async () => {
      // Przygotuj wiele transferów i stanów
      const transfer1 = await Transfer.create({
        fullName: 'Yellow Test Product',  // Użyj tej samej nazwy
        size: 'M',  // Użyj tego samego rozmiaru
        transfer_from: 'Source1',
        transfer_to: 'MultiUser',
        date: new Date('2025-08-31'),
        dateString: '2025-08-31',
        productId: 'multi_undo_product_1',
        processed: true,
        processedAt: new Date()
      });

      const transfer2 = await Transfer.create({
        fullName: 'Yellow Test Product',  // Użyj tej samej nazwy
        size: 'M',  // Użyj tego samego rozmiaru
        transfer_from: 'Source2',
        transfer_to: 'MultiUser',
        date: new Date('2025-08-31'),
        dateString: '2025-08-31',
        productId: 'multi_undo_product_2',
        processed: true,
        processedAt: new Date()
      });

      const state1 = await State.create({
        _id: new mongoose.Types.ObjectId(),
        fullName: testGoods._id,
        size: testSize._id,
        sellingPoint: testUser._id,
        date: new Date(),
        barcode: 'INCOMING_111_aaa',
        price: 100
      });

      const state2 = await State.create({
        _id: new mongoose.Types.ObjectId(),
        fullName: testGoods._id,
        size: testSize._id,
        sellingPoint: testUser._id,
        date: new Date(),
        barcode: 'INCOMING_222_bbb',
        price: 150
      });

      const transactionId = 'multi_undo_999';

      // Utwórz historię dla obu produktów
      await History.create([
        {
          collectionName: 'State',
          operation: 'Dodano do stanu (transfer przychodzący)',
          transactionId,
          timestamp: new Date(),
          product: 'Multi Undo Product 1',
          details: JSON.stringify({
            stateId: state1._id,
            transferId: transfer1._id,
            isIncomingTransfer: true,
            targetUser: 'MultiUser'
          })
        },
        {
          collectionName: 'State',
          operation: 'Dodano do stanu (transfer przychodzący)',
          transactionId,
          timestamp: new Date(),
          product: 'Multi Undo Product 2',
          details: JSON.stringify({
            stateId: state2._id,
            transferId: transfer2._id,
            isIncomingTransfer: true,
            targetUser: 'MultiUser'
          })
        }
      ]);

      await LastTransaction.create({
        transactionId,
        operationType: 'incoming_transfer',
        transactionType: 'incoming',
        itemCount: 2,
        timestamp: new Date()
      });

      const response = await request(testApp)
        .post('/api/transfer/undo-last');

      expect(response.status).toBe(200);
      expect(response.body.restoredCount).toBe(2);

      // Sprawdź czy wszystkie elementy zostały usunięte ze stanu
      const remainingStateItems = await State.find({});
      expect(remainingStateItems).toHaveLength(0);

      // Sprawdź czy wszystkie transfery zostały przywrócone
      const restoredTransfers = await Transfer.find({ processed: false });
      expect(restoredTransfers).toHaveLength(2);
    });

    test('10. Powinien obsłużyć błąd gdy brak transferId w details', async () => {
      const stateItem = await State.create({
        _id: new mongoose.Types.ObjectId(),
        fullName: testGoods._id,
        size: testSize._id,
        sellingPoint: testUser._id,
        date: new Date(),
        barcode: 'INCOMING_broken_xyz',
        price: 300
      });

      // Historia bez transferId
      await History.create({
        collectionName: 'State',
        operation: 'Dodano do stanu (transfer przychodzący)',
        transactionId: 'broken_details_111',
        timestamp: new Date(),
        product: 'Broken Details Product',
        details: JSON.stringify({
          stateId: stateItem._id,
          isIncomingTransfer: true,
          targetUser: 'BrokenUser'
          // Brak transferId
        })
      });

      await LastTransaction.create({
        transactionId: 'broken_details_111',
        operationType: 'incoming_transfer',
        transactionType: 'incoming',
        itemCount: 1,
        timestamp: new Date()
      });

      const response = await request(testApp)
        .post('/api/transfer/undo-last');

      expect(response.status).toBe(200);
      expect(response.body.restoredCount).toBe(1);

      // Element powinien zostać usunięty ze stanu mimo braku transferId
      const remainingStateItems = await State.find({});
      expect(remainingStateItems).toHaveLength(0);
    });
  });

  describe('Integration Tests - Yellow Products Workflow', () => {
    test('11. Pełny workflow: Process → Check Last Transaction → Undo', async () => {
      // 1. Przygotuj transfer
      const testTransfer = await Transfer.create({
        fullName: 'Yellow Test Product',  // Użyj tej samej nazwy
        size: 'M',  // Użyj tego samego rozmiaru
        transfer_from: 'WorkflowSource',
        transfer_to: 'WorkflowUser',
        date: new Date('2025-08-31'),
        dateString: '2025-08-31',
        productId: 'workflow_test_product_m',
        processed: false
      });

      const yellowProduct = {
        _id: testTransfer._id.toString(),
        fullName: 'Yellow Test Product',  // Użyj tej samej nazwy
        size: 'M',  // Użyj tego samego rozmiaru
        isIncomingTransfer: true,
        transfer_to: 'WorkflowUser'
      };

      // 2. Przetwórz produkt
      const processResponse = await request(testApp)
        .post('/api/transfer/process-warehouse')
        .send({
          warehouseItems: [yellowProduct],
          selectedDate: '2025-08-31',
          selectedUser: 'WorkflowUser',
          transactionId: 'workflow_integration_test',
          isIncomingTransfer: true  // DODANO: dla żółtych produktów
        });

      expect(processResponse.status).toBe(200);

      // 3. Sprawdź ostatnią transakcję
      const lastTransactionResponse = await request(testApp)
        .get('/api/transfer/last-transaction');

      expect(lastTransactionResponse.status).toBe(200);
      expect(lastTransactionResponse.body.transactionId).toBe('workflow_integration_test');
      expect(lastTransactionResponse.body.transactionType).toBe('incoming');
      expect(lastTransactionResponse.body.itemCount).toBe(1);

      // 4. Cofnij transakcję
      const undoResponse = await request(testApp)
        .post('/api/transfer/undo-last');

      expect(undoResponse.status).toBe(200);
      expect(undoResponse.body.transactionId).toBe('workflow_integration_test');

      // 5. Sprawdź czy transfer został przywrócony
      const finalTransfer = await Transfer.findById(testTransfer._id);
      expect(finalTransfer.processed).toBe(false);

      // 6. Sprawdź czy stan został wyczyszczony
      const finalState = await State.find({});
      expect(finalState).toHaveLength(0);

      // 7. Sprawdź czy ostatnia transakcja już nie istnieje
      const noLastTransactionResponse = await request(testApp)
        .get('/api/transfer/last-transaction');

      expect(noLastTransactionResponse.status).toBe(404);
    });
  });
});
