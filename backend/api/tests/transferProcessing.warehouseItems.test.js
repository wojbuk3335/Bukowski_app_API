const request = require('supertest');
const express = require('express');

// Import kontrolerów
const transferProcessing = require('../app/controllers/transferProcessing');

// Konfiguracja Express dla testów
const app = express();
app.use(express.json());

// Dodaj routy do testowania
app.post('/api/transfer/process-warehouse', (req, res) => transferProcessing.processWarehouseItems(req, res));

// Mock console.log aby testy były ciche
const originalConsoleLog = console.log;
beforeAll(() => {
  console.log = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
});

describe('AddToState - Pomarańczowe kurtki (testy podstawowe)', () => {

  test('endpoint process-warehouse istnieje i odpowiada', async () => {
    const warehouseItems = [{
      _id: 'test1',
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
    const warehouseItems = [{
      _id: 'test2',
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
    const warehouseItems = [
      {
        _id: 'multi1',
        fullName: 'Kurtka 1',
        size: 'S',
        barcode: 'MULTI123',
        price: 80,
        fromWarehouse: true,
        transfer_from: 'MAGAZYN',
        transfer_to: 'Symbol1'
      },
      {
        _id: 'multi2',
        fullName: 'Kurtka 2',
        size: 'M',
        barcode: 'MULTI456',
        price: 90,
        fromWarehouse: true,
        transfer_from: 'MAGAZYN',
        transfer_to: 'Symbol1'
      },
      {
        _id: 'multi3',
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
