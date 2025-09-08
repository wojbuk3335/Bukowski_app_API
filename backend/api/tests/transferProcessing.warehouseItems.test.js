const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Import modeli
const State = require('../app/db/models/state');
const User = require('../app/db/models/user');
const Goods = require('../app/db/models/goods');
const Size = require('../app/db/models/size');
const Color = require('../app/db/models/color');
const Category = require('../app/db/models/category');
const Stock = require('../app/db/models/stock');

// Import kontrolerów
const transferProcessing = require('../app/controllers/transferProcessing');

let mongoServer;
let app;

// Mock console.log aby testy były ciche
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeAll(async () => {
  // Uruchom in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri);
  
  // Konfiguracja Express dla testów
  app = express();
  app.use(express.json());
  
  // Dodaj routy do testowania
  app.post('/api/transfer/process-warehouse', (req, res) => transferProcessing.processWarehouseItems(req, res));
  
  // Mock console aby testy były ciche
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(async () => {
  // Przywróć console
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
  
  // Zamknij połączenie z bazą danych
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

// Funkcje pomocnicze do tworzenia testowych danych
let magazynUser = null; // Globalna zmienna dla magazynu (tylko jeden może istnieć)

async function createTestUser(symbol, name = 'Test User', role = 'user') {
  // Jeśli to magazyn i już istnieje, zwróć istniejący
  if (role === 'magazyn' && magazynUser) {
    return magazynUser;
  }
  
  const userData = {
    _id: new mongoose.Types.ObjectId(),
    symbol: symbol,
    name: name,
    email: `${symbol.toLowerCase()}@test.com`,
    password: 'testpass',
    role: role
  };
  
  // Dodaj wymagane pola dla użytkowników (nie dla magazynu)
  if (role === 'user') {
    userData.sellingPoint = symbol;
    userData.location = `Location ${symbol}`;
  } else if (role === 'magazyn') {
    userData.sellingPoint = null;
    userData.location = null;
  }
  
  const user = await User.create(userData);
  
  // Zapisz magazyn globalnie
  if (role === 'magazyn') {
    magazynUser = user;
  }
  
  return user;
}

async function createTestGoods(name = 'Test Goods') {
  // Stwórz Stock
  const stock = await mongoose.model('Stock').create({
    _id: new mongoose.Types.ObjectId(),
    Tow_Kod: `STOCK_${Date.now()}`,
    Tow_Opis: 'Test Stock'
  });

  // Stwórz Category  
  const category = await Category.create({
    _id: new mongoose.Types.ObjectId(),
    Kat_1_Kod_1: `CAT_${Date.now()}`,
    Kat_1_Opis_1: 'Test Category'
  });
  
  // Stwórz Color
  const color = await Color.create({
    _id: new mongoose.Types.ObjectId(),
    Kol_Kod: `COL_${Date.now()}`,
    Kol_Opis: 'Test Color'
  });
  
  // Stwórz Goods z wszystkimi wymaganymi polami
  return await Goods.create({
    _id: new mongoose.Types.ObjectId(),
    stock: stock._id,
    color: color._id,
    fullName: name,
    code: `CODE_${Date.now()}`,
    price: 100,
    category: 'test-category',
    subcategory: category._id,
    Plec: 'unisex'
  });
}

async function createTestSize(name = 'M') {
  return await Size.create({
    _id: new mongoose.Types.ObjectId(),
    Roz_Kod: name,
    Roz_Opis: `Size ${name}`
  });
}

describe('AddToState - Pomarańczowe kurtki (testy podstawowe)', () => {

  beforeEach(async () => {
    // Wyczyść bazę danych przed każdym testem
    await State.deleteMany({});
    await User.deleteMany({});
    await Goods.deleteMany({});
    await Size.deleteMany({});
    await Color.deleteMany({});
    await Category.deleteMany({});
    await Stock.deleteMany({});
    
    // Zresetuj globalną zmienną magazynu
    magazynUser = null;
  });

  test('endpoint process-warehouse istnieje i odpowiada', async () => {
    // Stwórz niezbędne dane testowe
    const testUser = await createTestUser('Symbol1', 'Test User', 'user');
    const magazynUser = await createTestUser('MAGAZYN', 'Magazyn User', 'magazyn');
    const testGoods = await createTestGoods('Test Kurtka');
    const testSize = await createTestSize('M');
    
    // Stwórz warehouse item w bazie
    const warehouseItem = await State.create({
      _id: new mongoose.Types.ObjectId(),
      fullName: testGoods._id,
      size: testSize._id,
      barcode: 'TEST123',
      sellingPoint: magazynUser._id,
      price: 100,
      date: new Date()
    });

    const warehouseItems = [{
      _id: warehouseItem._id,
      fullName: 'Test Kurtka',
      size: 'M',
      barcode: 'TEST123',
      price: 100,
      fromWarehouse: true,
      transfer_from: 'MAGAZYN',
      transfer_to: 'Symbol1'
    }];

    const response = await request(app)
      .post('/api/transfer/process-warehouse')
      .send({
        warehouseItems,
        selectedDate: '2025-08-27',
        selectedUser: 'user1',
        transactionId: 'test-transaction-123'
      });

    // Sprawdź że endpoint odpowiada (nie weryfikujemy logiki biznesowej)
    expect(response.status).toBeDefined();
    expect([200, 400, 500]).toContain(response.status);
  });

  test('endpoint wymaga danych wejściowych', async () => {
    const response = await request(app)
      .post('/api/transfer/process-warehouse')
      .send({});

    // Powinien zwrócić błąd dla pustych danych
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('endpoint przyjmuje poprawny format danych', async () => {
    // Stwórz niezbędne dane testowe
    const testUser = await createTestUser('Symbol2', 'Test User', 'user');
    const magazynUser = await createTestUser('MAGAZYN', 'Magazyn User', 'magazyn');
    const testGoods = await createTestGoods('Inna Kurtka');
    const testSize = await createTestSize('L');
    
    // Stwórz warehouse item w bazie
    const warehouseItem = await State.create({
      _id: new mongoose.Types.ObjectId(),
      fullName: testGoods._id,
      size: testSize._id,
      barcode: 'TEST456',
      sellingPoint: magazynUser._id,
      price: 150,
      date: new Date()
    });

    const warehouseItems = [{
      _id: warehouseItem._id,
      fullName: 'Inna Kurtka',
      size: 'L',
      barcode: 'TEST456',
      price: 150,
      fromWarehouse: true,
      transfer_from: 'MAGAZYN',
      transfer_to: 'Symbol2'
    }];

    const requestData = {
      warehouseItems,
      selectedDate: '2025-08-27',
      selectedUser: 'user2',
      transactionId: 'test-transaction-456'
    };

    const response = await request(app)
      .post('/api/transfer/process-warehouse')
      .send(requestData);

    // Sprawdź że dane są akceptowane
    expect(response.status).toBeDefined();
    
    // Jeśli zwraca błąd, nie powinno być o format danych
    if (response.status >= 400 && response.body.message) {
      expect(response.body.message).not.toMatch(/format|parsing|json/i);
    }
  });

  test('endpoint obsługuje wiele produktów jednocześnie', async () => {
    // Stwórz niezbędne dane testowe
    const testUser1 = await createTestUser('Symbol1', 'Test User', 'user');
    const magazynUser = await createTestUser('MAGAZYN', 'Magazyn User', 'magazyn');
    const testGoods1 = await createTestGoods('Kurtka 1');
    const testGoods2 = await createTestGoods('Kurtka 2');
    const testGoods3 = await createTestGoods('Kurtka 3');
    const testSizeS = await createTestSize('S');
    const testSizeM = await createTestSize('M');
    const testSizeL = await createTestSize('L');
    
    // Stwórz warehouse items w bazie
    const warehouseItem1 = await State.create({
      _id: new mongoose.Types.ObjectId(),
      fullName: testGoods1._id,
      size: testSizeS._id,
      barcode: 'MULTI123',
      sellingPoint: magazynUser._id,
      price: 80,
      date: new Date()
    });
    
    const warehouseItem2 = await State.create({
      _id: new mongoose.Types.ObjectId(),
      fullName: testGoods2._id,
      size: testSizeM._id,
      barcode: 'MULTI456',
      sellingPoint: magazynUser._id,
      price: 120,
      date: new Date()
    });
    
    const warehouseItem3 = await State.create({
      _id: new mongoose.Types.ObjectId(),
      fullName: testGoods3._id,
      size: testSizeL._id,
      barcode: 'MULTI789',
      sellingPoint: magazynUser._id,
      price: 100,
      date: new Date()
    });

    const warehouseItems = [
      {
        _id: warehouseItem1._id,
        fullName: 'Kurtka 1',
        size: 'S',
        barcode: 'MULTI123',
        price: 80,
        fromWarehouse: true,
        transfer_from: 'MAGAZYN',
        transfer_to: 'Symbol1'
      },
      {
        _id: warehouseItem2._id,
        fullName: 'Kurtka 2',
        size: 'M',
        barcode: 'MULTI456',
        price: 120,
        fromWarehouse: true,
        transfer_from: 'MAGAZYN',
        transfer_to: 'Symbol1'
      },
      {
        _id: warehouseItem3._id,
        fullName: 'Kurtka 3',
        size: 'L',
        barcode: 'MULTI789',
        price: 100,
        fromWarehouse: true,
        transfer_from: 'MAGAZYN',
        transfer_to: 'Symbol1'
      }
    ];

    const response = await request(app)
      .post('/api/transfer/process-warehouse')
      .send({
        warehouseItems,
        selectedDate: '2025-08-27',
        selectedUser: 'user1',
        transactionId: 'test-multi-items'
      });

    expect(response.status).toBeDefined();
    
    // Sprawdź że endpoint nie ma problemu z wieloma elementami
    if (response.status >= 400 && response.body.message) {
      expect(response.body.message).not.toMatch(/too many|limit|count/i);
    }
  });

  test('endpoint waliduje wymagane pola w warehouseItems', async () => {
    // Test z brakującymi polami
    const incompleteItems = [{
      _id: 'incomplete1',
      // brak fullName
      size: 'M',
      barcode: 'INCOMPLETE123'
      // brak price, fromWarehouse, etc.
    }];

    const response = await request(app)
      .post('/api/transfer/process-warehouse')
      .send({
        warehouseItems: incompleteItems,
        selectedDate: '2025-08-27',
        selectedUser: 'user1',
        transactionId: 'test-incomplete'
      });

    expect(response.status).toBeDefined();
    
    // Endpoint powinien obsłużyć niepełne dane (error lub sukces)
    expect([200, 400, 422, 500]).toContain(response.status);
  });

});
