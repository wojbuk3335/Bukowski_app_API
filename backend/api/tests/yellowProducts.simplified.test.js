const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app/app');
const History = require('../app/db/models/history');
const Transfer = require('../app/db/models/transfer');
const State = require('../app/db/models/state');

describe('Yellow Products (Incoming Transfers) - Simplified Backend Tests', () => {
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
    await History.deleteMany({});
    await Transfer.deleteMany({});
    await State.deleteMany({});
  });

  describe('Yellow Products Processing', () => {
    test('1. Powinien przetworzyć żółty produkt i dodać do stanu', async () => {
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
        transfer_from: 'Punkt A'
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

      // Sprawdź czy element został dodany do stanu
      const stateItems = await State.find({});
      expect(stateItems).toHaveLength(1);
      expect(stateItems[0].fullName).toBe('Yellow Test Product');
      expect(stateItems[0].symbol).toBe('TestUser');
      expect(stateItems[0].barcode).toMatch(/^INCOMING_/);

      // Sprawdź czy transfer został oznaczony jako przetworzony
      const updatedTransfer = await Transfer.findById(testTransfer._id);
      expect(updatedTransfer.processed).toBe(true);

      // Sprawdź historię
      const historyEntries = await History.find({});
      expect(historyEntries).toHaveLength(1);
      expect(historyEntries[0].operation).toBe('Dodano do stanu (transfer przychodzący)');
    });

    test('2. Powinien wygenerować unikalny kod kreskowy', async () => {
      const testTransfer = await Transfer.create({
        fullName: 'Barcode Test Product',
        size: 'L',
        transfer_from: 'Source',
        transfer_to: 'BarcodeUser',
        date: new Date('2025-08-31'),
        processed: false
      });

      const yellowProduct = {
        _id: testTransfer._id.toString(),
        fullName: 'Barcode Test Product',
        size: 'L',
        isIncomingTransfer: true,
        transfer_to: 'BarcodeUser'
      };

      const response = await request(app)
        .post('/api/transfer/process-warehouse')
        .send({
          warehouseItems: [yellowProduct],
          selectedDate: '2025-08-31',
          selectedUser: 'BarcodeUser',
          transactionId: 'barcode_test'
        });

      expect(response.status).toBe(200);

      const stateItem = await State.findOne({});
      expect(stateItem.barcode).toMatch(/^INCOMING_\d+_[a-z0-9]+$/);
    });

    test('3. Powinien przetworzyć wiele żółtych produktów', async () => {
      const transfers = await Transfer.create([
        {
          fullName: 'Yellow Product 1',
          size: 'S',
          transfer_from: 'Source1',
          transfer_to: 'MultiUser',
          processed: false
        },
        {
          fullName: 'Yellow Product 2',
          size: 'M',
          transfer_from: 'Source2',
          transfer_to: 'MultiUser',
          processed: false
        }
      ]);

      const yellowProducts = transfers.map(transfer => ({
        _id: transfer._id.toString(),
        fullName: transfer.fullName,
        size: transfer.size,
        isIncomingTransfer: true,
        transfer_to: 'MultiUser'
      }));

      const response = await request(app)
        .post('/api/transfer/process-warehouse')
        .send({
          warehouseItems: yellowProducts,
          selectedDate: '2025-08-31',
          selectedUser: 'MultiUser',
          transactionId: 'multi_test'
        });

      expect(response.status).toBe(200);
      expect(response.body.addedItems).toHaveLength(2);

      const stateItems = await State.find({});
      expect(stateItems).toHaveLength(2);

      const historyEntries = await History.find({});
      expect(historyEntries).toHaveLength(2);
    });

    test('4. Powinien obsłużyć błąd nieistniejącego transferu', async () => {
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
          transactionId: 'error_test'
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toContain(expect.stringContaining('nie znaleziono transferu'));

      const stateItems = await State.find({});
      expect(stateItems).toHaveLength(0);
    });
  });

  describe('Last Transaction Support', () => {
    test('5. Powinien rozpoznać żółte produkty jako ostatnią transakcję', async () => {
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
    });

    test('6. Powinien prawidłowo liczyć elementy transakcji', async () => {
      const transactionId = 'multi_yellow_count';

      await History.create([
        {
          operation: 'Dodano do stanu (transfer przychodzący)',
          transactionId,
          timestamp: new Date(),
          product: 'Product 1'
        },
        {
          operation: 'Dodano do stanu (transfer przychodzący)',
          transactionId,
          timestamp: new Date(),
          product: 'Product 2'
        },
        {
          operation: 'Dodano do stanu (transfer przychodzący)',
          transactionId,
          timestamp: new Date(),
          product: 'Product 3'
        }
      ]);

      const response = await request(app)
        .get('/api/transfer/last-transaction');

      expect(response.status).toBe(200);
      expect(response.body.itemCount).toBe(3);
      expect(response.body.transactionType).toBe('incoming');
    });
  });

  describe('Undo Functionality', () => {
    test('7. Powinien cofnąć transakcję żółtych produktów', async () => {
      const testTransfer = await Transfer.create({
        fullName: 'Undo Test Product',
        size: 'XL',
        transfer_from: 'UndoSource',
        transfer_to: 'UndoUser',
        processed: true,
        processedAt: new Date()
      });

      const stateItem = await State.create({
        fullName: 'Undo Test Product',
        size: 'XL',
        symbol: 'UndoUser',
        barcode: 'INCOMING_undo_123'
      });

      await History.create({
        operation: 'Dodano do stanu (transfer przychodzący)',
        transactionId: 'undo_test_789',
        timestamp: new Date(),
        product: 'Undo Test Product',
        details: JSON.stringify({
          stateId: stateItem._id,
          transferId: testTransfer._id,
          isIncomingTransfer: true,
          targetUser: 'UndoUser'
        })
      });

      const response = await request(app)
        .post('/api/transfer/undo-last');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Transaction successfully undone (history cleaned)');

      // Sprawdź czy element został usunięty ze stanu
      const remainingStateItems = await State.find({});
      expect(remainingStateItems).toHaveLength(0);

      // Sprawdź czy transfer został przywrócony
      const restoredTransfer = await Transfer.findById(testTransfer._id);
      expect(restoredTransfer.processed).toBe(false);

      // Sprawdź czy historia została wyczyszczona
      const remainingHistory = await History.find({});
      expect(remainingHistory).toHaveLength(0);
    });

    test('8. Powinien cofnąć wiele żółtych produktów', async () => {
      const transfers = await Transfer.create([
        {
          fullName: 'Multi Undo 1',
          size: 'S',
          transfer_from: 'Source1',
          transfer_to: 'MultiUndoUser',
          processed: true
        },
        {
          fullName: 'Multi Undo 2',
          size: 'M',
          transfer_from: 'Source2',
          transfer_to: 'MultiUndoUser',
          processed: true
        }
      ]);

      const states = await State.create([
        {
          fullName: 'Multi Undo 1',
          size: 'S',
          symbol: 'MultiUndoUser',
          barcode: 'INCOMING_multi1_123'
        },
        {
          fullName: 'Multi Undo 2',
          size: 'M',
          symbol: 'MultiUndoUser',
          barcode: 'INCOMING_multi2_456'
        }
      ]);

      const transactionId = 'multi_undo_test';

      await History.create([
        {
          operation: 'Dodano do stanu (transfer przychodzący)',
          transactionId,
          timestamp: new Date(),
          product: 'Multi Undo 1',
          details: JSON.stringify({
            stateId: states[0]._id,
            transferId: transfers[0]._id,
            isIncomingTransfer: true,
            targetUser: 'MultiUndoUser'
          })
        },
        {
          operation: 'Dodano do stanu (transfer przychodzący)',
          transactionId,
          timestamp: new Date(),
          product: 'Multi Undo 2',
          details: JSON.stringify({
            stateId: states[1]._id,
            transferId: transfers[1]._id,
            isIncomingTransfer: true,
            targetUser: 'MultiUndoUser'
          })
        }
      ]);

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
  });

  describe('Integration Tests', () => {
    test('9. Pełny workflow: Process → Undo', async () => {
      // 1. Przygotuj transfer
      const testTransfer = await Transfer.create({
        fullName: 'Workflow Test',
        size: 'M',
        transfer_from: 'WorkflowSource',
        transfer_to: 'WorkflowUser',
        processed: false
      });

      // 2. Przetwórz
      const processResponse = await request(app)
        .post('/api/transfer/process-warehouse')
        .send({
          warehouseItems: [{
            _id: testTransfer._id.toString(),
            fullName: 'Workflow Test',
            size: 'M',
            isIncomingTransfer: true,
            transfer_to: 'WorkflowUser'
          }],
          selectedDate: '2025-08-31',
          selectedUser: 'WorkflowUser',
          transactionId: 'workflow_test'
        });

      expect(processResponse.status).toBe(200);

      // 3. Sprawdź ostatnią transakcję
      const lastTransactionResponse = await request(app)
        .get('/api/transfer/last-transaction');

      expect(lastTransactionResponse.status).toBe(200);
      expect(lastTransactionResponse.body.transactionType).toBe('incoming');

      // 4. Cofnij
      const undoResponse = await request(app)
        .post('/api/transfer/undo-last');

      expect(undoResponse.status).toBe(200);

      // 5. Sprawdź końcowy stan
      const finalTransfer = await Transfer.findById(testTransfer._id);
      expect(finalTransfer.processed).toBe(false);

      const finalState = await State.find({});
      expect(finalState).toHaveLength(0);
    });
  });
});
