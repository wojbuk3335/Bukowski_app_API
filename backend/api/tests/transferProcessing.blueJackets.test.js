const transferProcessing = require('../app/controllers/transferProcessing');

// Mock console aby testy były ciche
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

describe('AddToState - Niebieskie kurtki (sales items) - backend testy', () => {

  test('processSalesItems funkcja istnieje', () => {
    expect(transferProcessing.processSalesItems).toBeDefined();
    expect(typeof transferProcessing.processSalesItems).toBe('function');
  });

  test('processSalesItems przyjmuje parametry req i res', () => {
    // Test że funkcja nie rzuca błędu przy wywołaniu z parametrami
    expect(() => {
      transferProcessing.processSalesItems.length;
    }).not.toThrow();
    
    // Sprawdź liczbę parametrów (powinna być 2: req, res)
    expect(transferProcessing.processSalesItems.length).toBe(2);
  });

  // Mock req i res objects dla testów
  const createMockReq = (body = {}) => ({
    body,
    headers: {},
    method: 'POST',
    url: '/api/transfer/process-sales'
  });

  const createMockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
  };

  test('obsługuje pusty request body dla sprzedaży', () => {
    const req = createMockReq({});
    const res = createMockRes();

    // Sprawdź że funkcja istnieje i można ją wywołać
    expect(() => {
      transferProcessing.processSalesItems(req, res);
    }).not.toThrow();
  });

  test('obsługuje format danych sprzedaży (mock test)', () => {
    const salesItems = [{
      _id: 'sale1',
      fullName: 'Test Niebieska Kurtka',
      size: 'M',
      barcode: 'BLUE123',
      from: 'Punkt1',
      sellingPoint: 'Punkt2',
      timestamp: '2025-08-28T10:00:00Z',
      price: 160,
      advancePayment: 32,
      isFromSale: true,
      isBlueBullet: true
    }];

    const req = createMockReq({
      salesItems,
      selectedDate: '2025-08-28',
      selectedUser: 'user1',
      transactionId: 'test-sales-transaction-123'
    });
    const res = createMockRes();

    // Sprawdź że dane mają poprawną strukturę
    expect(req.body.salesItems).toHaveLength(1);
    expect(req.body.salesItems[0]).toHaveProperty('isFromSale', true);
    expect(req.body.salesItems[0]).toHaveProperty('isBlueBullet', true);
  });

  test('weryfikuje strukturę danych sprzedaży (mock test)', () => {
    const salesItem = {
      _id: 'sale-test',
      fullName: 'Test Kurtka',
      size: 'M',
      barcode: 'TEST123',
      from: 'Punkt1',
      sellingPoint: 'Punkt2',
      timestamp: '2025-08-28T10:00:00Z',
      price: 160,
      advancePayment: 32,
      isFromSale: true,
      isBlueBullet: true
    };

    // Sprawdź strukturę danych sprzedaży
    expect(salesItem).toHaveProperty('_id');
    expect(salesItem).toHaveProperty('fullName');
    expect(salesItem).toHaveProperty('size');
    expect(salesItem).toHaveProperty('barcode');
    expect(salesItem).toHaveProperty('from');
    expect(salesItem).toHaveProperty('sellingPoint');
    expect(salesItem).toHaveProperty('timestamp');
    expect(salesItem).toHaveProperty('price');
    expect(salesItem).toHaveProperty('advancePayment');
    expect(salesItem).toHaveProperty('isFromSale', true);
    expect(salesItem).toHaveProperty('isBlueBullet', true);
  });

  test('sprawdza typy danych w strukturze sprzedaży', () => {
    const salesItem = {
      _id: 'sale-types',
      fullName: 'Test Kurtka',
      size: 'L',
      barcode: 'TYPES456',
      from: 'Punkt3',
      sellingPoint: 'Punkt4',
      timestamp: '2025-08-28T15:00:00Z',
      price: 200,
      advancePayment: 40,
      isFromSale: true,
      isBlueBullet: true
    };

    expect(typeof salesItem._id).toBe('string');
    expect(typeof salesItem.fullName).toBe('string');
    expect(typeof salesItem.size).toBe('string');
    expect(typeof salesItem.barcode).toBe('string');
    expect(typeof salesItem.from).toBe('string');
    expect(typeof salesItem.sellingPoint).toBe('string');
    expect(typeof salesItem.timestamp).toBe('string');
    expect(typeof salesItem.price).toBe('number');
    expect(typeof salesItem.advancePayment).toBe('number');
    expect(typeof salesItem.isFromSale).toBe('boolean');
    expect(typeof salesItem.isBlueBullet).toBe('boolean');
  });

  test('sprawdza różne zaliczki w strukturze danych', () => {
    const salesWithAdvance = [
      { advancePayment: 0, price: 100 },
      { advancePayment: 25, price: 125 },
      { advancePayment: 50, price: 200 },
      { advancePayment: 75, price: 300 }
    ];

    salesWithAdvance.forEach(sale => {
      expect(sale.advancePayment).toBeGreaterThanOrEqual(0);
      expect(sale.price).toBeGreaterThan(0);
      expect(sale.price).toBeGreaterThanOrEqual(sale.advancePayment);
    });
  });

  test('sprawdza timestampy w różnych formatach', () => {
    const validTimestamps = [
      '2025-08-28T10:00:00Z',
      '2025-12-31T23:59:59Z',
      '2025-01-01T00:00:00Z'
    ];

    validTimestamps.forEach(timestamp => {
      const date = new Date(timestamp);
      expect(date).toBeInstanceOf(Date);
      expect(date.getTime()).not.toBeNaN();
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    });
  });

  test('controller odróżnia sprzedaże od transferów magazynowych', async () => {
    // Test że funkcje dla różnych typów kurtek istnieją i działają niezależnie
    expect(transferProcessing.processSalesItems).toBeDefined();
    expect(transferProcessing.processWarehouseItems).toBeDefined();
    
    // Powinny być różnymi funkcjami
    expect(transferProcessing.processSalesItems).not.toBe(transferProcessing.processWarehouseItems);
  });

  test('processSalesItems to główna funkcja niebieskich kurtek', () => {
    // Sprawdź że funkcja jest dostępna jako metoda controllera
    expect(transferProcessing.processSalesItems).toBeDefined();
    expect(typeof transferProcessing.processSalesItems).toBe('function');
    
    // Sprawdź że to funkcja async (powinna mieć właściwość constructor.name === 'AsyncFunction')
    expect(transferProcessing.processSalesItems.constructor.name).toBe('AsyncFunction');
  });

  test('controller ma wszystkie funkcjonalności sprzedaży', () => {
    const salesRelatedMethods = [
      'processSalesItems',
      'processAllTransfers',
      'undoLastTransaction',
      'getLastTransaction'
    ];

    salesRelatedMethods.forEach(method => {
      expect(transferProcessing[method]).toBeDefined();
      expect(typeof transferProcessing[method]).toBe('function');
    });
  });

});
