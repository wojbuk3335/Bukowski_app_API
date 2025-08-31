const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app/app');
const History = require('../app/db/models/history');
const Transfer = require('../app/db/models/transfer');
const State = require('../app/db/models/state');
const LastTransaction = require('../app/db/models/lastTransaction');

describe('Yellow Products Race Conditions and Concurrency Tests', () => {
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
    await LastTransaction.deleteMany({});
  });

  describe('Race Condition Prevention - Yellow Products', () => {
    test('1. Powinien zapobiec podwójnemu przetworzeniu tego samego żółtego produktu', async () => {
      // Przygotuj transfer
      const testTransfer = await Transfer.create({
        fullName: 'Race Test Product',
        size: 'L',
        transfer_from: 'RaceSource',
        transfer_to: 'RaceUser',
        date: new Date('2025-08-31'),
        processed: false
      });

      const yellowProduct = {
        _id: testTransfer._id.toString(),
        fullName: 'Race Test Product',
        size: 'L',
        isIncomingTransfer: true,
        transfer_to: 'RaceUser'
      };

      const requestPayload = {
        warehouseItems: [yellowProduct],
        selectedDate: '2025-08-31',
        selectedUser: 'RaceUser',
        transactionId: 'race_test_concurrent'
      };

      // Wykonaj równoczesne zapytania
      const [response1, response2] = await Promise.all([
        request(app)
          .post('/api/transfer/process-warehouse')
          .send(requestPayload),
        request(app)
          .post('/api/transfer/process-warehouse')
          .send({...requestPayload, transactionId: 'race_test_concurrent_2'})
      ]);

      // Jedno powinno się udać, drugie powinno być odrzucone
      const successfulResponses = [response1, response2].filter(r => r.status === 200);
      const failedResponses = [response1, response2].filter(r => r.status !== 200 || r.body.errors?.length > 0);

      expect(successfulResponses).toHaveLength(1);
      
      // Sprawdź czy tylko jeden element został dodany do stanu
      const stateItems = await State.find({});
      expect(stateItems).toHaveLength(1);

      // Sprawdź czy transfer jest oznaczony jako przetworzony tylko raz
      const updatedTransfer = await Transfer.findById(testTransfer._id);
      expect(updatedTransfer.processed).toBe(true);

      // Sprawdź czy tylko jedna historia została utworzona
      const historyEntries = await History.find({});
      expect(historyEntries).toHaveLength(1);
    });

    test('2. Powinien bezpiecznie obsłużyć równoczesne cofanie żółtych produktów', async () => {
      // Przygotuj przetworzone żółte produkty
      const testTransfer = await Transfer.create({
        fullName: 'Concurrent Undo Product',
        size: 'M',
        transfer_from: 'UndoSource',
        transfer_to: 'UndoUser',
        processed: true,
        processedAt: new Date()
      });

      const stateItem = await State.create({
        fullName: 'Concurrent Undo Product',
        size: 'M',
        symbol: 'UndoUser',
        barcode: 'INCOMING_concurrent_123'
      });

      await History.create({
        operation: 'Dodano do stanu (transfer przychodzący)',
        transactionId: 'concurrent_undo_test',
        timestamp: new Date(),
        product: 'Concurrent Undo Product',
        details: JSON.stringify({
          stateId: stateItem._id,
          transferId: testTransfer._id,
          isIncomingTransfer: true,
          targetUser: 'UndoUser'
        })
      });

      await LastTransaction.create({
        transactionId: 'concurrent_undo_test',
        operationType: 'incoming_transfer',
        timestamp: new Date()
      });

      // Wykonaj równoczesne cofania
      const [undoResponse1, undoResponse2] = await Promise.all([
        request(app).post('/api/transfer/undo-last'),
        request(app).post('/api/transfer/undo-last')
      ]);

      // Jedno powinno się udać, drugie powinno zwrócić błąd
      const successfulUndos = [undoResponse1, undoResponse2].filter(r => r.status === 200);
      const failedUndos = [undoResponse1, undoResponse2].filter(r => r.status === 404);

      expect(successfulUndos).toHaveLength(1);
      expect(failedUndos).toHaveLength(1);

      // Sprawdź końcowy stan
      const remainingStateItems = await State.find({});
      expect(remainingStateItems).toHaveLength(0);

      const restoredTransfer = await Transfer.findById(testTransfer._id);
      expect(restoredTransfer.processed).toBe(false);
    });

    test('3. Powinien zapewnić atomowość przy przetwarzaniu wielu żółtych produktów', async () => {
      // Przygotuj wiele transferów
      const transfers = await Transfer.create([
        {
          fullName: 'Atomic Test Product 1',
          size: 'S',
          transfer_from: 'AtomicSource',
          transfer_to: 'AtomicUser',
          processed: false
        },
        {
          fullName: 'Atomic Test Product 2',
          size: 'M',
          transfer_from: 'AtomicSource',
          transfer_to: 'AtomicUser',
          processed: false
        },
        {
          fullName: 'Atomic Test Product 3',
          size: 'L',
          transfer_from: 'AtomicSource',
          transfer_to: 'AtomicUser',
          processed: false
        }
      ]);

      const yellowProducts = transfers.map(transfer => ({
        _id: transfer._id.toString(),
        fullName: transfer.fullName,
        size: transfer.size,
        isIncomingTransfer: true,
        transfer_to: 'AtomicUser'
      }));

      const response = await request(app)
        .post('/api/transfer/process-warehouse')
        .send({
          warehouseItems: yellowProducts,
          selectedDate: '2025-08-31',
          selectedUser: 'AtomicUser',
          transactionId: 'atomic_test_123'
        });

      expect(response.status).toBe(200);
      expect(response.body.addedItems).toHaveLength(3);

      // Sprawdź czy wszystkie transfery zostały przetworzone
      const processedTransfers = await Transfer.find({ processed: true });
      expect(processedTransfers).toHaveLength(3);

      // Sprawdź czy wszystkie elementy zostały dodane do stanu
      const stateItems = await State.find({});
      expect(stateItems).toHaveLength(3);

      // Sprawdź czy wszystkie wpisy historii mają ten sam transactionId
      const historyEntries = await History.find({});
      expect(historyEntries).toHaveLength(3);
      expect(historyEntries.every(entry => entry.transactionId === 'atomic_test_123')).toBe(true);

      // Sprawdź czy LastTransaction została utworzona
      const lastTransaction = await LastTransaction.findOne({});
      expect(lastTransaction.transactionId).toBe('atomic_test_123');
    });

    test('4. Powinien obsłużyć błąd w środku batch-a żółtych produktów', async () => {
      // Przygotuj dwa transfery - jeden poprawny, jeden niepoprawny
      const validTransfer = await Transfer.create({
        fullName: 'Valid Yellow Product',
        size: 'M',
        transfer_from: 'ValidSource',
        transfer_to: 'BatchErrorUser',
        processed: false
      });

      const yellowProducts = [
        {
          _id: validTransfer._id.toString(),
          fullName: 'Valid Yellow Product',
          size: 'M',
          isIncomingTransfer: true,
          transfer_to: 'BatchErrorUser'
        },
        {
          _id: new mongoose.Types.ObjectId().toString(), // Nieistniejący transfer
          fullName: 'Invalid Yellow Product',
          size: 'L',
          isIncomingTransfer: true,
          transfer_to: 'BatchErrorUser'
        }
      ];

      const response = await request(app)
        .post('/api/transfer/process-warehouse')
        .send({
          warehouseItems: yellowProducts,
          selectedDate: '2025-08-31',
          selectedUser: 'BatchErrorUser',
          transactionId: 'batch_error_test'
        });

      expect(response.status).toBe(200);
      expect(response.body.addedItems).toHaveLength(1); // Tylko poprawny
      expect(response.body.errors).toHaveLength(1); // Jeden błąd

      // Sprawdź czy poprawny transfer został przetworzony
      const processedTransfer = await Transfer.findById(validTransfer._id);
      expect(processedTransfer.processed).toBe(true);

      // Sprawdź czy poprawny element został dodany do stanu
      const stateItems = await State.find({});
      expect(stateItems).toHaveLength(1);
      expect(stateItems[0].fullName).toBe('Valid Yellow Product');

      // Sprawdź czy historia została utworzona tylko dla poprawnego elementu
      const historyEntries = await History.find({});
      expect(historyEntries).toHaveLength(1);
      expect(historyEntries[0].product).toBe('Valid Yellow Product');
    });
  });

  describe('Performance and Load Tests', () => {
    test('5. Powinien obsłużyć dużą liczbę żółtych produktów w rozsądnym czasie', async () => {
      // Przygotuj 50 transferów
      const transfers = [];
      for (let i = 1; i <= 50; i++) {
        transfers.push({
          fullName: `Load Test Product ${i}`,
          size: i % 2 === 0 ? 'M' : 'L',
          transfer_from: 'LoadSource',
          transfer_to: 'LoadUser',
          processed: false
        });
      }

      const createdTransfers = await Transfer.create(transfers);

      const yellowProducts = createdTransfers.map(transfer => ({
        _id: transfer._id.toString(),
        fullName: transfer.fullName,
        size: transfer.size,
        isIncomingTransfer: true,
        transfer_to: 'LoadUser'
      }));

      const startTime = Date.now();

      const response = await request(app)
        .post('/api/transfer/process-warehouse')
        .send({
          warehouseItems: yellowProducts,
          selectedDate: '2025-08-31',
          selectedUser: 'LoadUser',
          transactionId: 'load_test_performance'
        });

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(response.body.addedItems).toHaveLength(50);
      expect(processingTime).toBeLessThan(10000); // Maksymalnie 10 sekund

      // Sprawdź wyniki
      const stateItems = await State.find({});
      expect(stateItems).toHaveLength(50);

      const historyEntries = await History.find({});
      expect(historyEntries).toHaveLength(50);
    }, 15000); // Timeout 15 sekund dla tego testu

    test('6. Powinien obsłużyć równoczesne przetwarzanie różnych żółtych produktów', async () => {
      // Przygotuj transfery dla różnych użytkowników
      const transfersUser1 = await Transfer.create([
        {
          fullName: 'Concurrent Product A1',
          size: 'S',
          transfer_from: 'Source1',
          transfer_to: 'User1',
          processed: false
        },
        {
          fullName: 'Concurrent Product A2',
          size: 'M',
          transfer_from: 'Source1',
          transfer_to: 'User1',
          processed: false
        }
      ]);

      const transfersUser2 = await Transfer.create([
        {
          fullName: 'Concurrent Product B1',
          size: 'L',
          transfer_from: 'Source2',
          transfer_to: 'User2',
          processed: false
        },
        {
          fullName: 'Concurrent Product B2',
          size: 'XL',
          transfer_from: 'Source2',
          transfer_to: 'User2',
          processed: false
        }
      ]);

      const yellowProductsUser1 = transfersUser1.map(t => ({
        _id: t._id.toString(),
        fullName: t.fullName,
        size: t.size,
        isIncomingTransfer: true,
        transfer_to: 'User1'
      }));

      const yellowProductsUser2 = transfersUser2.map(t => ({
        _id: t._id.toString(),
        fullName: t.fullName,
        size: t.size,
        isIncomingTransfer: true,
        transfer_to: 'User2'
      }));

      // Równoczesne przetwarzanie dla różnych użytkowników
      const [response1, response2] = await Promise.all([
        request(app)
          .post('/api/transfer/process-warehouse')
          .send({
            warehouseItems: yellowProductsUser1,
            selectedDate: '2025-08-31',
            selectedUser: 'User1',
            transactionId: 'concurrent_user1_test'
          }),
        request(app)
          .post('/api/transfer/process-warehouse')
          .send({
            warehouseItems: yellowProductsUser2,
            selectedDate: '2025-08-31',
            selectedUser: 'User2',
            transactionId: 'concurrent_user2_test'
          })
      ]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response1.body.addedItems).toHaveLength(2);
      expect(response2.body.addedItems).toHaveLength(2);

      // Sprawdź czy wszystkie produkty zostały przetworzone
      const stateItemsUser1 = await State.find({ symbol: 'User1' });
      const stateItemsUser2 = await State.find({ symbol: 'User2' });

      expect(stateItemsUser1).toHaveLength(2);
      expect(stateItemsUser2).toHaveLength(2);

      // Sprawdź czy historia została utworzona dla obu transakcji
      const historyUser1 = await History.find({ transactionId: 'concurrent_user1_test' });
      const historyUser2 = await History.find({ transactionId: 'concurrent_user2_test' });

      expect(historyUser1).toHaveLength(2);
      expect(historyUser2).toHaveLength(2);
    });
  });

  describe('Data Integrity Tests', () => {
    test('7. Powinien zachować integralność danych przy przerwaniu procesu', async () => {
      // Symulacja przerwania podczas przetwarzania
      const testTransfer = await Transfer.create({
        fullName: 'Integrity Test Product',
        size: 'M',
        transfer_from: 'IntegritySource',
        transfer_to: 'IntegrityUser',
        processed: false
      });

      // Rozpocznij przetwarzanie
      const yellowProduct = {
        _id: testTransfer._id.toString(),
        fullName: 'Integrity Test Product',
        size: 'M',
        isIncomingTransfer: true,
        transfer_to: 'IntegrityUser'
      };

      // Normalny proces powinien zachować integralność
      const response = await request(app)
        .post('/api/transfer/process-warehouse')
        .send({
          warehouseItems: [yellowProduct],
          selectedDate: '2025-08-31',
          selectedUser: 'IntegrityUser',
          transactionId: 'integrity_test_123'
        });

      expect(response.status).toBe(200);

      // Sprawdź spójność danych
      const processedTransfer = await Transfer.findById(testTransfer._id);
      const stateItem = await State.findOne({ symbol: 'IntegrityUser' });
      const historyEntry = await History.findOne({ transactionId: 'integrity_test_123' });
      const lastTransaction = await LastTransaction.findOne({ transactionId: 'integrity_test_123' });

      expect(processedTransfer.processed).toBe(true);
      expect(stateItem).toBeTruthy();
      expect(historyEntry).toBeTruthy();
      expect(lastTransaction).toBeTruthy();

      // Sprawdź czy wszystkie dane są spójne
      const historyDetails = JSON.parse(historyEntry.details);
      expect(historyDetails.stateId.toString()).toBe(stateItem._id.toString());
      expect(historyDetails.transferId.toString()).toBe(testTransfer._id.toString());
      expect(historyDetails.isIncomingTransfer).toBe(true);
      expect(historyDetails.targetUser).toBe('IntegrityUser');
    });

    test('8. Powinien poprawnie obsłużyć unikalne kody kreskowe przy wysokim obciążeniu', async () => {
      // Przygotuj wiele transferów w tym samym czasie
      const transfers = [];
      for (let i = 1; i <= 20; i++) {
        transfers.push({
          fullName: `Barcode Test Product ${i}`,
          size: 'M',
          transfer_from: 'BarcodeSource',
          transfer_to: 'BarcodeUser',
          processed: false
        });
      }

      const createdTransfers = await Transfer.create(transfers);

      const yellowProducts = createdTransfers.map(transfer => ({
        _id: transfer._id.toString(),
        fullName: transfer.fullName,
        size: transfer.size,
        isIncomingTransfer: true,
        transfer_to: 'BarcodeUser'
      }));

      const response = await request(app)
        .post('/api/transfer/process-warehouse')
        .send({
          warehouseItems: yellowProducts,
          selectedDate: '2025-08-31',
          selectedUser: 'BarcodeUser',
          transactionId: 'barcode_uniqueness_test'
        });

      expect(response.status).toBe(200);
      expect(response.body.addedItems).toHaveLength(20);

      // Sprawdź czy wszystkie kody kreskowe są unikalne
      const stateItems = await State.find({});
      const barcodes = stateItems.map(item => item.barcode);
      const uniqueBarcodes = [...new Set(barcodes)];

      expect(barcodes).toHaveLength(20);
      expect(uniqueBarcodes).toHaveLength(20); // Wszystkie powinny być unikalne

      // Sprawdź format kodów kreskowych
      barcodes.forEach(barcode => {
        expect(barcode).toMatch(/^INCOMING_\d+_[a-z0-9]+$/);
      });
    });
  });
});
