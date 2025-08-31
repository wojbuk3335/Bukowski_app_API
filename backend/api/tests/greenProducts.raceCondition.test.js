const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Import modeli
const State = require('../app/db/models/state');
const Sales = require('../app/db/models/sales');
const History = require('../app/db/models/history');
const User = require('../app/db/models/user');
const Goods = require('../app/db/models/goods');
const Size = require('../app/db/models/size');
const Color = require('../app/db/models/color');
const Stock = require('../app/db/models/stock');
const Category = require('../app/db/models/category');

// Import kontrolera
const TransferProcessingController = require('../app/controllers/transferProcessing');

let mongoServer;
let app;

beforeAll(async () => {
  // Uruchom in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri);
  
  // Setup Express app z routami
  const express = require('express');
  app = express();
  app.use(express.json());
  
  // Dodaj route do testowania
  app.post('/api/transfer/process-sales', TransferProcessingController.processSalesItems);
  app.post('/api/transfer/process-warehouse', TransferProcessingController.processWarehouseItems);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Wyczyść bazy danych przed każdym testem
  await State.deleteMany({});
  await Sales.deleteMany({});
  await History.deleteMany({});
  await User.deleteMany({});
  await Goods.deleteMany({});
  await Size.deleteMany({});
  await Color.deleteMany({});
  await Stock.deleteMany({});
  await Category.deleteMany({});
});

describe('Green Products Backend Tests - Race Condition Fix', () => {
  let testUser, testGoods, testSize, testColor, testStock, testCategory;
  
  // Helper function do tworzenia User z wymaganymi polami
  const createTestUser = async (symbol = 'TEST', role = 'user', extraData = {}) => {
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
  
  beforeEach(async () => {
    // Przygotuj dane testowe
    testUser = await createTestUser('P');

    // Stwórz color
    testColor = await Color.create({
      _id: new mongoose.Types.ObjectId(),
      Kol_Kod: 'RUDY',
      Kol_Opis: 'Rudy kolor'
    });

    // Stwórz stock
    testStock = await Stock.create({
      _id: new mongoose.Types.ObjectId(),
      Tow_Kod: 'LAURA',
      Tow_Opis: 'Laura produkt'
    });

    // Stwórz category
    testCategory = await Category.create({
      _id: new mongoose.Types.ObjectId(),
      Kat_1_Kod_1: 'KURTKA',
      Kat_1_Opis_1: 'Kurtka',
      Plec: 'DAMSKA'
    });
    
    testGoods = await Goods.create({
      _id: new mongoose.Types.ObjectId(),
      stock: testStock._id,
      color: testColor._id,
      fullName: 'Laura RUDY',
      code: 'LAURA_RUDY',
      price: 100,
      category: 'KURTKA',
      subcategory: testCategory._id,
      Plec: 'DAMSKA'
    });
    
    testSize = await Size.create({
      _id: new mongoose.Types.ObjectId(),
      Roz_Kod: 'XS',
      Roz_Opis: 'XS'
    });
  });

  test('blue operations + orange operations sequence dla identycznych produktów', async () => {
    // Przygotuj dane warehouse
    const warehouseItem1 = await State.create({
      _id: new mongoose.Types.ObjectId(),
      fullName: testGoods._id,
      size: testSize._id,
      barcode: '0652301100004',
      sellingPoint: (await User.findOne({ symbol: 'MAGAZYN' }) || await createTestUser('MAGAZYN', 'magazyn'))._id,
      price: 100,
      discount_price: 0,
      date: new Date()
    });
    
    const warehouseItem2 = await State.create({
      _id: new mongoose.Types.ObjectId(),
      fullName: testGoods._id,
      size: testSize._id,
      barcode: '0652301100004',
      sellingPoint: (await User.findOne({ symbol: 'MAGAZYN' }))._id,
      price: 100,
      discount_price: 0,
      date: new Date()
    });

    // Przygotuj dane sales (symulacja sprzedaży w stanie)
    const stateItem1 = await State.create({
      _id: new mongoose.Types.ObjectId(),
      fullName: testGoods._id,
      size: testSize._id,
      barcode: '0652301100004',
      sellingPoint: testUser._id,
      price: 100,
      discount_price: 0,
      date: new Date()
    });
    
    const stateItem2 = await State.create({
      _id: new mongoose.Types.ObjectId(),
      fullName: testGoods._id,
      size: testSize._id,
      barcode: '0652301100004',
      sellingPoint: testUser._id,
      price: 100,
      discount_price: 0,
      date: new Date()
    });

    const transactionId = 'test-green-sequence-' + Date.now();
    
    // KROK 1: Blue operations (wszystkie sales write-offs)
    console.log('🔵 TESTING: Blue operations sequence');
    
    const salesRequest1 = {
      salesItems: [{
        _id: 'sales1',
        fullName: 'Laura RUDY',
        size: 'XS',
        barcode: '0652301100004',
        from: 'P'
      }],
      selectedUser: testUser._id,
      transactionId: transactionId
    };
    
    const salesRequest2 = {
      salesItems: [{
        _id: 'sales2',
        fullName: 'Laura RUDY',
        size: 'XS',
        barcode: '0652301100004',
        from: 'P'
      }],
      selectedUser: testUser._id,
      transactionId: transactionId
    };

    // Wykonaj blue operations
    const salesResponse1 = await request(app)
      .post('/api/transfer/process-sales')
      .send(salesRequest1);
      
    const salesResponse2 = await request(app)
      .post('/api/transfer/process-sales')
      .send(salesRequest2);

    expect(salesResponse1.status).toBe(200);
    expect(salesResponse2.status).toBe(200);
    
    // Sprawdź stan po blue operations
    const stateAfterBlue = await State.find({ sellingPoint: testUser._id });
    expect(stateAfterBlue.length).toBe(0); // Wszystkie produkty sprzedane
    
    // KROK 2: Orange operations (wszystkie warehouse transfers)
    console.log('🟠 TESTING: Orange operations sequence');
    
    const warehouseRequest1 = {
      warehouseItems: [{
        _id: warehouseItem1._id,
        fullName: 'Laura RUDY',
        size: 'XS',
        barcode: '0652301100004',
        transfer_to: 'P',
        price: 100,
        discount_price: 0
      }],
      transactionId: transactionId
    };
    
    const warehouseRequest2 = {
      warehouseItems: [{
        _id: warehouseItem2._id,
        fullName: 'Laura RUDY',
        size: 'XS',
        barcode: '0652301100004',
        transfer_to: 'P',
        price: 100,
        discount_price: 0
      }],
      transactionId: transactionId
    };

    // Wykonaj orange operations
    const warehouseResponse1 = await request(app)
      .post('/api/transfer/process-warehouse')
      .send(warehouseRequest1);
      
    const warehouseResponse2 = await request(app)
      .post('/api/transfer/process-warehouse')
      .send(warehouseRequest2);

    expect(warehouseResponse1.status).toBe(200);
    expect(warehouseResponse2.status).toBe(200);
    
    // KLUCZOWY TEST: Sprawdź finalny stan
    const finalState = await State.find({ sellingPoint: testUser._id });
    console.log('🎯 FINAL STATE COUNT:', finalState.length);
    
    expect(finalState.length).toBe(2); // Powinniśmy mieć 2 produkty!
    
    // Sprawdź że oba mają poprawny barcode
    finalState.forEach(item => {
      expect(item.barcode).toBe('0652301100004');
    });
    
    // Sprawdź historię
    const history = await History.find({ transactionId: transactionId });
    expect(history.length).toBe(4); // 2 sales + 2 warehouse operations
  });

  test('race condition prevention - sequential processing', async () => {
    // Test że warehouse operations nie overwrite się nawzajem
    const magazynUser = await User.findOne({ symbol: 'MAGAZYN' }) || await createTestUser('MAGAZYN', 'magazyn');
    
    const warehouseItem1 = await State.create({
      _id: new mongoose.Types.ObjectId(),
      fullName: testGoods._id,
      size: testSize._id,
      barcode: '0652301100004',
      sellingPoint: magazynUser._id,
      price: 100,
      date: new Date()
    });
    
    const warehouseItem2 = await State.create({
      _id: new mongoose.Types.ObjectId(),
      fullName: testGoods._id,
      size: testSize._id,
      barcode: '0652301100004',
      sellingPoint: magazynUser._id,
      price: 100,
      date: new Date()
    });

    const transactionId = 'race-test-' + Date.now();
    
    // Sprawdź stan przed
    const stateBefore = await State.find({ sellingPoint: testUser._id });
    expect(stateBefore.length).toBe(0);
    
    // Wykonaj warehouse operations z minimalnymi opóźnieniami
    const promises = [
      request(app)
        .post('/api/transfer/process-warehouse')
        .send({
          warehouseItems: [{
            _id: warehouseItem1._id,
            fullName: 'Laura RUDY',
            size: 'XS',
            barcode: '0652301100004',
            transfer_to: 'P',
            price: 100
          }],
          transactionId: transactionId
        }),
      
      // Małe opóźnienie aby symulować sequential processing
      new Promise(resolve => setTimeout(resolve, 100)).then(() => 
        request(app)
          .post('/api/transfer/process-warehouse')
          .send({
            warehouseItems: [{
              _id: warehouseItem2._id,
              fullName: 'Laura RUDY',
              size: 'XS',
              barcode: '0652301100004',
              transfer_to: 'P',
              price: 100
            }],
            transactionId: transactionId
          })
      )
    ];
    
    const responses = await Promise.all(promises);
    
    responses.forEach(response => {
      expect(response.status).toBe(200);
    });
    
    // Kluczowy test - finalny stan
    const finalState = await State.find({ sellingPoint: testUser._id });
    expect(finalState.length).toBe(2);
  });

  test('error handling podczas green products processing', async () => {
    // Test błędu podczas blue operation, ale orange powinno się wykonać
    const transactionId = 'error-test-' + Date.now();
    
    // Blue operation z błędnym produktem (nie istnieje w stanie)
    const salesResponse = await request(app)
      .post('/api/transfer/process-sales')
      .send({
        salesItems: [{
          _id: 'nonexistent',
          fullName: 'Nonexistent Product',
          size: 'XS',
          barcode: 'NONEXISTENT',
          from: 'P'
        }],
        selectedUser: testUser._id,
        transactionId: transactionId
      });
    
    // Powinno zwrócić sukces ale z błędami w details
    expect(salesResponse.status).toBe(200);
    expect(salesResponse.body.errors.length).toBeGreaterThan(0);
    
    // Orange operation powinna nadal działać
    const magazynUser = await User.findOne({ symbol: 'MAGAZYN' }) || await createTestUser('MAGAZYN', 'magazyn');
    
    const warehouseItem = await State.create({
      _id: new mongoose.Types.ObjectId(),
      fullName: testGoods._id,
      size: testSize._id,
      barcode: '0652301100004',
      sellingPoint: magazynUser._id,
      price: 100,
      date: new Date()
    });
    
    const warehouseResponse = await request(app)
      .post('/api/transfer/process-warehouse')
      .send({
        warehouseItems: [{
          _id: warehouseItem._id,
          fullName: 'Laura RUDY',
          size: 'XS',
          barcode: '0652301100004',
          transfer_to: 'P',
          price: 100
        }],
        transactionId: transactionId
      });
    
    expect(warehouseResponse.status).toBe(200);
    expect(warehouseResponse.body.processedCount).toBe(1);
    
    // Sprawdź że warehouse operation się udała mimo błędu w sales
    const finalState = await State.find({ sellingPoint: testUser._id });
    expect(finalState.length).toBe(1);
  });

  test('transaction ID consistency', async () => {
    const transactionId = 'consistency-test-' + Date.now();
    
    // Wykonaj operacje z tym samym transaction ID
    const magazynUser = await User.findOne({ symbol: 'MAGAZYN' }) || await createTestUser('MAGAZYN', 'magazyn');
    
    const warehouseItem = await State.create({
      _id: new mongoose.Types.ObjectId(),
      fullName: testGoods._id,
      size: testSize._id,
      barcode: '0652301100004',
      sellingPoint: magazynUser._id,
      price: 100,
      date: new Date()
    });
    
    await request(app)
      .post('/api/transfer/process-warehouse')
      .send({
        warehouseItems: [{
          _id: warehouseItem._id,
          fullName: 'Laura RUDY',
          size: 'XS',
          barcode: '0652301100004',
          transfer_to: 'P',
          price: 100
        }],
        transactionId: transactionId
      });
    
    // Sprawdź że wszystkie history entries mają ten sam transaction ID
    const history = await History.find({ transactionId: transactionId });
    expect(history.length).toBeGreaterThan(0);
    
    history.forEach(entry => {
      expect(entry.transactionId).toBe(transactionId);
    });
  });
});
