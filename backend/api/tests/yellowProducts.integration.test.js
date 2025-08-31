const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app/app');
const History = require('../app/db/models/history');
const Transfer = require('../app/db/models/transfer');
const State = require('../app/db/models/state');

describe('Yellow Products (Incoming Transfers) Backend Tests', () => {
  let mongoServer;
  let mongoUri;

  beforeAll(async () => {
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

      const response = await request(app)
        .post('/api/transfer/process-warehouse')
        .send({
          warehouseItems: [yellowProduct],
          selectedDate: '2025-08-31',
          selectedUser: 'TestUser',
          transactionId: 'test_yellow_123'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Warehouse items processed successfully');
      expect(response.body.transactionId).toBe('test_yellow_123');
      expect(response.body.addedItems).toHaveLength(1);

      // Sprawdź czy element został dodany do stanu
      const stateItems = await State.find({});
      expect(stateItems).toHaveLength(1);
      expect(stateItems[0].fullName).toBe('Yellow Test Product');
      expect(stateItems[0].symbol).toBe('TestUser');
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
        fullName: 'Unique Barcode Product',
        size: 'L',
        transfer_from: 'Punkt B',
        transfer_to: 'User2',
        date: new Date('2025-08-31'),
        processed: false
      });

      const yellowProduct = {
        _id: testTransfer._id.toString(),
        fullName: 'Unique Barcode Product',
        size: 'L',
        isIncomingTransfer: true,
        transfer_to: 'User2'
      };

      const response = await request(app)
        .post('/api/transfer/process-warehouse')
        .send({
          warehouseItems: [yellowProduct],
          selectedDate: '2025-08-31',
          selectedUser: 'User2',
          transactionId: 'barcode_test_456'
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
        fullName: 'Yellow Product 1',
        size: 'S',
        transfer_from: 'Punkt A',
        transfer_to: 'BatchUser',
        date: new Date('2025-08-31'),
        processed: false
      });

      const transfer2 = await Transfer.create({
        fullName: 'Yellow Product 2',
        size: 'M',
        transfer_from: 'Punkt B',
        transfer_to: 'BatchUser',
        date: new Date('2025-08-31'),
        processed: false
      });

      const yellowProducts = [
        {
          _id: transfer1._id.toString(),
          fullName: 'Yellow Product 1',
          size: 'S',
          isIncomingTransfer: true,
          transfer_to: 'BatchUser'
        },
        {
          _id: transfer2._id.toString(),
          fullName: 'Yellow Product 2',
          size: 'M',
          isIncomingTransfer: true,
          transfer_to: 'BatchUser'
        }
      ];

      const response = await request(app)
        .post('/api/transfer/process-warehouse')
        .send({
          warehouseItems: yellowProducts,
          selectedDate: '2025-08-31',
          selectedUser: 'BatchUser',
          transactionId: 'batch_test_789'
        });

      expect(response.status).toBe(200);
      expect(response.body.addedItems).toHaveLength(2);

      // Sprawdź stan
      const stateItems = await State.find({});
      expect(stateItems).toHaveLength(2);
      expect(stateItems.every(item => item.symbol === 'BatchUser')).toBe(true);

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

      const response = await request(app)
        .post('/api/transfer/process-warehouse')
        .send({
          warehouseItems: [nonExistentYellowProduct],
          selectedDate: '2025-08-31',
          selectedUser: 'TestUser',
          transactionId: 'error_test_999'
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toContain(expect.stringContaining('nie znaleziono transferu'));

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

      const response = await request(app)
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
          operation: 'Dodano do stanu (transfer przychodzący)',
          transactionId,
          timestamp: new Date(),
          product: 'Yellow Product 1'
        },
        {
          operation: 'Dodano do stanu (transfer przychodzący)',
          transactionId,
          timestamp: new Date(),
          product: 'Yellow Product 2'
        },
        {
          operation: 'Dodano do stanu (transfer przychodzący)',
          transactionId,
          timestamp: new Date(),
          product: 'Yellow Product 3'
        }
      ]);

      const response = await request(app)
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
        operation: 'Dodano do stanu (transfer przychodzący)',
        transactionId: 'older_yellow_123',
        timestamp: olderDate,
        product: 'Older Yellow Product'
      });

      // Nowsza transakcja
      await History.create({
        operation: 'Dodano do stanu (transfer przychodzący)',
        transactionId: 'newer_yellow_456',
        timestamp: newerDate,
        product: 'Newer Yellow Product'
      });

      const response = await request(app)
        .get('/api/transfer/last-transaction');

      expect(response.status).toBe(200);
      expect(response.body.transactionId).toBe('newer_yellow_456');
    });
  });

  describe('POST /api/transfer/undo-last - Yellow Products Undo', () => {
    test('8. Powinien cofnąć transakcję żółtych produktów', async () => {
      // Przygotuj transfer i stan
      const testTransfer = await Transfer.create({
        fullName: 'Undo Test Product',
        size: 'XL',
        transfer_from: 'Source',
        transfer_to: 'UndoUser',
        date: new Date('2025-08-31'),
        processed: true,
        processedAt: new Date()
      });

      const stateItem = await State.create({
        fullName: 'Undo Test Product',
        size: 'XL',
        symbol: 'UndoUser',
        barcode: 'INCOMING_12345_abc',
        price: 200
      });

      // Utwórz historię
      await History.create({
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
        timestamp: new Date()
      });

      const response = await request(app)
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
        fullName: 'Multi Undo Product 1',
        size: 'S',
        transfer_from: 'Source1',
        transfer_to: 'MultiUser',
        processed: true,
        processedAt: new Date()
      });

      const transfer2 = await Transfer.create({
        fullName: 'Multi Undo Product 2',
        size: 'M',
        transfer_from: 'Source2',
        transfer_to: 'MultiUser',
        processed: true,
        processedAt: new Date()
      });

      const state1 = await State.create({
        fullName: 'Multi Undo Product 1',
        size: 'S',
        symbol: 'MultiUser',
        barcode: 'INCOMING_111_aaa'
      });

      const state2 = await State.create({
        fullName: 'Multi Undo Product 2',
        size: 'M',
        symbol: 'MultiUser',
        barcode: 'INCOMING_222_bbb'
      });

      const transactionId = 'multi_undo_999';

      // Utwórz historię dla obu produktów
      await History.create([
        {
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
        timestamp: new Date()
      });

      const response = await request(app)
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
        fullName: 'Broken Details Product',
        size: 'L',
        symbol: 'BrokenUser',
        barcode: 'INCOMING_broken_xyz'
      });

      // Historia bez transferId
      await History.create({
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
        timestamp: new Date()
      });

      const response = await request(app)
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
        fullName: 'Workflow Test Product',
        size: 'M',
        transfer_from: 'WorkflowSource',
        transfer_to: 'WorkflowUser',
        date: new Date('2025-08-31'),
        processed: false
      });

      const yellowProduct = {
        _id: testTransfer._id.toString(),
        fullName: 'Workflow Test Product',
        size: 'M',
        isIncomingTransfer: true,
        transfer_to: 'WorkflowUser'
      };

      // 2. Przetwórz produkt
      const processResponse = await request(app)
        .post('/api/transfer/process-warehouse')
        .send({
          warehouseItems: [yellowProduct],
          selectedDate: '2025-08-31',
          selectedUser: 'WorkflowUser',
          transactionId: 'workflow_integration_test'
        });

      expect(processResponse.status).toBe(200);

      // 3. Sprawdź ostatnią transakcję
      const lastTransactionResponse = await request(app)
        .get('/api/transfer/last-transaction');

      expect(lastTransactionResponse.status).toBe(200);
      expect(lastTransactionResponse.body.transactionId).toBe('workflow_integration_test');
      expect(lastTransactionResponse.body.transactionType).toBe('incoming');
      expect(lastTransactionResponse.body.itemCount).toBe(1);

      // 4. Cofnij transakcję
      const undoResponse = await request(app)
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
      const noLastTransactionResponse = await request(app)
        .get('/api/transfer/last-transaction');

      expect(noLastTransactionResponse.status).toBe(404);
    });
  });
});
