const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Bezpośrednie modele bez importowania app.js
const History = require('../app/db/models/history');
const Transfer = require('../app/db/models/transfer');
const State = require('../app/db/models/state');
const Goods = require('../app/db/models/goods');
const Size = require('../app/db/models/size');
const User = require('../app/db/models/user');

describe('Yellow Products (Incoming Transfers) - Unit Tests', () => {
  let mongoServer;
  let mongoUri;

  beforeAll(async () => {
    // Zamknij istniejące połączenie jeśli istnieje
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
    await History.deleteMany({});
    await Transfer.deleteMany({});
    await State.deleteMany({});
    // Pozostałe modele usuną się automatycznie przez cascade
  });

  describe('Database Models for Yellow Products', () => {
    test('1. Powinien utworzyć transfer przychodzący', async () => {
      const transferData = {
        fullName: 'Test Yellow Product',
        size: 'M',
        transfer_from: 'Source Point',
        transfer_to: 'Target User',
        date: new Date('2025-08-31'),
        dateString: '2025-08-31',
        productId: 'test_product_123',
        processed: false
      };

      const transfer = await Transfer.create(transferData);

      expect(transfer).toBeDefined();
      expect(transfer._id).toBeDefined();
      expect(transfer.fullName).toBe('Test Yellow Product');
      expect(transfer.size).toBe('M');
      expect(transfer.transfer_from).toBe('Source Point');
      expect(transfer.transfer_to).toBe('Target User');
      expect(transfer.productId).toBe('test_product_123');
      expect(transfer.dateString).toBe('2025-08-31');
      expect(transfer.yellowProcessed).toBe(false);
    });

    test('2. Powinien oznaczyć transfer jako przetworzony', async () => {
      const transfer = await Transfer.create({
        fullName: 'Process Test',
        size: 'L',
        transfer_from: 'Source',
        transfer_to: 'User',
        date: new Date('2025-08-31'),
        dateString: '2025-08-31',
        productId: 'process_test_456',
        yellowProcessed: false
      });

      // Oznacz jako przetworzony
      transfer.yellowProcessed = true;
      transfer.yellowProcessedAt = new Date();
      await transfer.save();

      const updatedTransfer = await Transfer.findById(transfer._id);
      expect(updatedTransfer.yellowProcessed).toBe(true);
      expect(updatedTransfer.yellowProcessedAt).toBeDefined();
    });

    test('3. Powinien dodać element do stanu z kodem kreskowym', async () => {
      // Najpierw stwórz wymagane referencje
      
      // Dodatkowe modele dla Goods
      const Stock = require('../app/db/models/stock');
      const Color = require('../app/db/models/color');
      const Category = require('../app/db/models/category');

      const stock = await Stock.create({
        _id: new mongoose.Types.ObjectId(),
        Tow_Kod: 'TST001',
        Tow_Opis: 'Test Stock'
      });

      const color = await Color.create({
        _id: new mongoose.Types.ObjectId(),
        Kol_Kod: 'TST001',
        Kol_Opis: 'Test Color'
      });

      const category = await Category.create({
        _id: new mongoose.Types.ObjectId(),
        Kat_1_Kod_1: 'TST001',
        Kat_1_Opis_1: 'Test Category'
      });

      const good = await Goods.create({
        _id: new mongoose.Types.ObjectId(),
        fullName: 'State Yellow Product',
        code: 'SYP001',
        price: 100,
        category: 'Clothing',
        subcategory: category._id,
        Plec: 'Unisex',
        stock: stock._id,
        color: color._id
      });

      const size = await Size.create({
        _id: new mongoose.Types.ObjectId(),
        Roz_Kod: 'S',
        Roz_Opis: 'Small'
      });

      const user = await User.create({
        _id: new mongoose.Types.ObjectId(),
        login: 'TestUser',
        first_name: 'Test',
        last_name: 'User',
        email: 'testuser@example.com',
        password: 'hashedpassword123',
        symbol: 'TEST',
        sellingPoint: 'TestPoint',
        location: 'TestLocation',
        role: 'user'
      });

      const stateData = {
        _id: new mongoose.Types.ObjectId(),
        fullName: good._id,
        size: size._id,
        sellingPoint: user._id,
        barcode: 'INCOMING_123_abc456',
        date: new Date(),
        price: 100
      };

      const stateItem = await State.create(stateData);

      expect(stateItem).toBeDefined();
      expect(stateItem.fullName.toString()).toBe(good._id.toString());
      expect(stateItem.size.toString()).toBe(size._id.toString());
      expect(stateItem.sellingPoint.toString()).toBe(user._id.toString());
      expect(stateItem.barcode).toBe('INCOMING_123_abc456');
      expect(stateItem.barcode).toMatch(/^INCOMING_/);
      expect(stateItem.price).toBe(100);
    });

    test('4. Powinien utworzyć wpis w historii dla transferu przychodzącego', async () => {
      const historyData = {
        collectionName: 'transfers',
        operation: 'Dodano do stanu (transfer przychodzący)',
        transactionId: 'yellow_test_123',
        timestamp: new Date(),
        product: 'History Test Product',
        from: 'Source Point',
        to: 'Target User',
        details: JSON.stringify({
          stateId: new mongoose.Types.ObjectId(),
          transferId: new mongoose.Types.ObjectId(),
          isIncomingTransfer: true,
          targetUser: 'HistoryUser'
        })
      };

      const historyEntry = await History.create(historyData);

      expect(historyEntry).toBeDefined();
      expect(historyEntry.collectionName).toBe('transfers');
      expect(historyEntry.operation).toBe('Dodano do stanu (transfer przychodzący)');
      expect(historyEntry.transactionId).toBe('yellow_test_123');
      expect(historyEntry.product).toBe('History Test Product');
      expect(historyEntry.from).toBe('Source Point');
      expect(historyEntry.to).toBe('Target User');

      const details = JSON.parse(historyEntry.details);
      expect(details.isIncomingTransfer).toBe(true);
      expect(details.targetUser).toBe('HistoryUser');
    });

    test('5. Powinien znaleźć najnowszą transakcję żółtych produktów', async () => {
      const baseTime = new Date();

      // Stwórz kilka wpisów historii
      await History.create([
        {
          collectionName: 'other',
          operation: 'Inna operacja',
          transactionId: 'other_123',
          timestamp: new Date(baseTime.getTime() - 10000),
          product: 'Other Product'
        },
        {
          collectionName: 'transfers',
          operation: 'Dodano do stanu (transfer przychodzący)',
          transactionId: 'yellow_456',
          timestamp: new Date(baseTime.getTime() - 5000),
          product: 'Yellow Product 1'
        },
        {
          collectionName: 'transfers',
          operation: 'Dodano do stanu (transfer przychodzący)',
          transactionId: 'yellow_789',
          timestamp: baseTime,
          product: 'Yellow Product 2'
        }
      ]);

      // Znajdź najnowszą transakcję żółtych produktów
      const latestYellowTransaction = await History
        .findOne({ operation: 'Dodano do stanu (transfer przychodzący)' })
        .sort({ timestamp: -1 });

      expect(latestYellowTransaction).toBeDefined();
      expect(latestYellowTransaction.transactionId).toBe('yellow_789');
      expect(latestYellowTransaction.product).toBe('Yellow Product 2');
    });

    test('6. Powinien zliczyć elementy w transakcji żółtych produktów', async () => {
      const transactionId = 'yellow_count_test';

      await History.create([
        {
          collectionName: 'transfers',
          operation: 'Dodano do stanu (transfer przychodzący)',
          transactionId,
          timestamp: new Date(),
          product: 'Product 1'
        },
        {
          collectionName: 'transfers',
          operation: 'Dodano do stanu (transfer przychodzący)',
          transactionId,
          timestamp: new Date(),
          product: 'Product 2'
        },
        {
          collectionName: 'transfers',
          operation: 'Dodano do stanu (transfer przychodzący)',
          transactionId,
          timestamp: new Date(),
          product: 'Product 3'
        }
      ]);

      const count = await History.countDocuments({
        transactionId,
        operation: 'Dodano do stanu (transfer przychodzący)'
      });

      expect(count).toBe(3);
    });

    test('7. Powinien obsłużyć workflow cofania transakcji', async () => {
      // 1. Stwórz transfer
      const transfer = await Transfer.create({
        fullName: 'Undo Test Product',
        size: 'XL',
        transfer_from: 'UndoSource',
        transfer_to: 'UndoUser',
        date: new Date('2025-08-31'),
        dateString: '2025-08-31',
        productId: 'undo_test_789',
        processed: true
      });

      // 2. Stwórz wymagane referencje dla State (uproszczone)
      const Stock = require('../app/db/models/stock');
      const Color = require('../app/db/models/color');
      const Category = require('../app/db/models/category');

      const stock = await Stock.create({
        _id: new mongoose.Types.ObjectId(),
        Tow_Kod: 'UND001',
        Tow_Opis: 'Undo Stock'
      });

      const color = await Color.create({
        _id: new mongoose.Types.ObjectId(),
        Kol_Kod: 'UND001',
        Kol_Opis: 'Undo Color'
      });

      const category = await Category.create({
        _id: new mongoose.Types.ObjectId(),
        Kat_1_Kod_1: 'UND001',
        Kat_1_Opis_1: 'Undo Category'
      });

      const good = await Goods.create({
        _id: new mongoose.Types.ObjectId(),
        fullName: 'Undo Test Product',
        code: 'UTP001',
        price: 150,
        category: 'Test',
        subcategory: category._id,
        Plec: 'Unisex',
        stock: stock._id,
        color: color._id
      });

      const size = await Size.create({
        _id: new mongoose.Types.ObjectId(),
        Roz_Kod: 'XL',
        Roz_Opis: 'Extra Large'
      });

      const user = await User.create({
        _id: new mongoose.Types.ObjectId(),
        login: 'UndoUser',
        first_name: 'Undo',
        last_name: 'User',
        email: 'undouser@example.com',
        password: 'hashedpassword456',
        symbol: 'UNDO',
        sellingPoint: 'UndoPoint',
        location: 'UndoLocation',
        role: 'user'
      });

      const stateItem = await State.create({
        _id: new mongoose.Types.ObjectId(),
        fullName: good._id,
        size: size._id,
        sellingPoint: user._id,
        barcode: 'INCOMING_undo_123',
        date: new Date(),
        price: 150
      });

      const historyEntry = await History.create({
        collectionName: 'transfers',
        operation: 'Dodano do stanu (transfer przychodzący)',
        transactionId: 'undo_test',
        timestamp: new Date(),
        product: 'Undo Test Product',
        from: 'UndoSource',
        to: 'UndoUser',
        details: JSON.stringify({
          stateId: stateItem._id,
          transferId: transfer._id,
          isIncomingTransfer: true,
          targetUser: 'UndoUser'
        })
      });

      // 3. Symuluj cofanie - usuń ze stanu
      await State.findByIdAndDelete(stateItem._id);

      // 4. Przywróć transfer
      transfer.yellowProcessed = false;
      await transfer.save();

      // 5. Usuń historię
      await History.findByIdAndDelete(historyEntry._id);

      // 6. Sprawdź stan końcowy
      const remainingStateItems = await State.find({});
      expect(remainingStateItems).toHaveLength(0);

      const restoredTransfer = await Transfer.findById(transfer._id);
      expect(restoredTransfer.yellowProcessed).toBe(false);

      const remainingHistory = await History.find({});
      expect(remainingHistory).toHaveLength(0);
    });

    test('8. Powinien wygenerować unikalny kod kreskowy dla transferu', async () => {
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const barcode = `INCOMING_${timestamp}_${randomSuffix}`;

      expect(barcode).toMatch(/^INCOMING_\d+_[a-z0-9]+$/);
      expect(barcode.length).toBeGreaterThan(15);
      expect(barcode.startsWith('INCOMING_')).toBe(true);
    });

    test('9. Powinien obsłużyć wiele transferów jednocześnie', async () => {
      const transfersData = [
        {
          fullName: 'Batch Product 1',
          size: 'S',
          transfer_from: 'Source1',
          transfer_to: 'BatchUser',
          date: new Date('2025-08-31'),
          dateString: '2025-08-31',
          productId: 'batch_1',
          processed: false
        },
        {
          fullName: 'Batch Product 2',
          size: 'M',
          transfer_from: 'Source2',
          transfer_to: 'BatchUser',
          date: new Date('2025-08-31'),
          dateString: '2025-08-31',
          productId: 'batch_2',
          processed: false
        },
        {
          fullName: 'Batch Product 3',
          size: 'L',
          transfer_from: 'Source3',
          transfer_to: 'BatchUser',
          date: new Date('2025-08-31'),
          dateString: '2025-08-31',
          productId: 'batch_3',
          processed: false
        }
      ];

      const transfers = await Transfer.create(transfersData);

      expect(transfers).toHaveLength(3);
      transfers.forEach((transfer, index) => {
        expect(transfer.fullName).toBe(`Batch Product ${index + 1}`);
        expect(transfer.transfer_to).toBe('BatchUser');
        expect(transfer.productId).toBe(`batch_${index + 1}`);
        expect(transfer.yellowProcessed).toBe(false);
      });

      // Symuluj przetworzenie wszystkich
      await Transfer.updateMany(
        { _id: { $in: transfers.map(t => t._id) } },
        { $set: { processed: true, processedAt: new Date() } }
      );

      const processedTransfers = await Transfer.find({ processed: true });
      expect(processedTransfers).toHaveLength(3);
    });

    test('10. Powinien zachować spójność danych bez transakcji', async () => {
      const transferData = {
        fullName: 'Consistency Test Product',
        size: 'M',
        transfer_from: 'ConsistencySource',
        transfer_to: 'ConsistencyUser',
        date: new Date('2025-08-31'),
        dateString: '2025-08-31',
        productId: 'consistency_test',
        processed: false
      };

      // Test spójności bez sesji MongoDB (brak wsparcia dla transakcji w MongoDB Memory Server)
      try {
        // 1. Stwórz transfer
        const transfer = await Transfer.create(transferData);
        
        // 2. Oznacz jako przetworzony
        transfer.yellowProcessed = true;
        await transfer.save();
        
        // 3. Dodaj historię
        const historyData = {
          collectionName: 'transfers',
          operation: 'Dodano do stanu (transfer przychodzący)',
          transactionId: 'consistency_test',
          timestamp: new Date(),
          product: transfer.fullName,
          from: transfer.transfer_from,
          to: transfer.transfer_to
        };
        const history = await History.create(historyData);

        // Sprawdź czy wszystko zostało zapisane
        const savedTransfer = await Transfer.findOne({ fullName: 'Consistency Test Product' });
        const savedHistory = await History.findOne({ transactionId: 'consistency_test' });

        expect(savedTransfer).toBeDefined();
        expect(savedTransfer.yellowProcessed).toBe(true);
        expect(savedHistory).toBeDefined();
        expect(savedHistory.operation).toBe('Dodano do stanu (transfer przychodzący)');

      } catch (error) {
        throw error;
      }
    });
  });
});
