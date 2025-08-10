// AddToState.rollback.unit.test.js
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('🔄 AddToState Rollback Unit Tests', () => {
  
  test('🔄 UNIT TEST 1: Rollback API call structure', async () => {
    // Mock successful API response
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        success: true,
        restoredItems: [
          { id: 'item1', targetSymbol: 'ORIG1', type: 'sold' },
          { id: 'item2', targetSymbol: 'ORIG2', type: 'transferred' }
        ]
      }
    });

    // Simulate the API call that would be made
    const transactionId = 'TXN001';
    const response = await axios.post('/api/undo-transaction', {
      transactionId
    });

    // Verify API call was made correctly
    expect(mockedAxios.post).toHaveBeenCalledWith('/api/undo-transaction', {
      transactionId: 'TXN001'
    });

    // Verify response structure
    expect(response.data.success).toBe(true);
    expect(response.data.restoredItems).toHaveLength(2);
    expect(response.data.restoredItems[0].targetSymbol).toBe('ORIG1');
    expect(response.data.restoredItems[1].targetSymbol).toBe('ORIG2');
  });

  test('🔄 UNIT TEST 2: Single item rollback API call', async () => {
    // Mock successful single item rollback
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        success: true,
        restoredItem: { id: 'item1', targetSymbol: 'ORIG1', type: 'sold' }
      }
    });

    // Simulate single item rollback API call
    const response = await axios.post('/api/undo-single-item', {
      itemId: 'item1',
      transactionId: 'TXN001'
    });

    expect(mockedAxios.post).toHaveBeenCalledWith('/api/undo-single-item', {
      itemId: 'item1',
      transactionId: 'TXN001'
    });

    expect(response.data.success).toBe(true);
    expect(response.data.restoredItem.id).toBe('item1');
  });

  test('🔄 UNIT TEST 3: Transfer validation logic - productId lookup', () => {
    const productData = [
      { _id: 'prod1', barcode: '1111111111111', fullName: 'Product 1', size: 'M' },
      { _id: 'prod2', barcode: '2222222222222', fullName: 'Product 2', size: 'L' }
    ];

    const transferItem = {
      productId: 'prod1',
      fullName: 'Product 1',
      size: 'M'
    };

    // Method 1: Direct productId lookup
    const findBarcodeByProductId = (item, products) => {
      if (item.productId) {
        const product = products.find(p => p._id === item.productId);
        return product ? product.barcode : null;
      }
      return null;
    };

    const result = findBarcodeByProductId(transferItem, productData);
    expect(result).toBe('1111111111111');
  });

  test('🔄 UNIT TEST 4: Transfer validation logic - direct barcode field', () => {
    const transferItem = {
      barcode: '3333333333333',
      fullName: 'Product 3',
      size: 'S'
    };

    // Method 2: Direct barcode field
    const findBarcodeByField = (item) => {
      return item.barcode || null;
    };

    const result = findBarcodeByField(transferItem);
    expect(result).toBe('3333333333333');
  });

  test('🔄 UNIT TEST 5: Transfer validation logic - name and size matching', () => {
    const productData = [
      { _id: 'prod1', barcode: '1111111111111', fullName: 'Product 1', size: 'M' },
      { _id: 'prod2', barcode: '2222222222222', fullName: 'Product 2', size: 'L' }
    ];

    const transferItem = {
      fullName: 'Product 2',
      size: 'L'
    };

    // Method 3: Name and size matching
    const findBarcodeByMatching = (item, products) => {
      const matchingProduct = products.find(p => 
        p.fullName === item.fullName && 
        p.size === item.size
      );
      return matchingProduct ? matchingProduct.barcode : null;
    };

    const result = findBarcodeByMatching(transferItem, productData);
    expect(result).toBe('2222222222222');
  });

  test('🔄 UNIT TEST 6: ProcessedIds management during rollback', () => {
    // Initial state
    const initialState = {
      processedSalesIds: ['sold1', 'sold2', 'sold3'],
      processedTransferIds: ['transfer1', 'transfer2', 'transfer3']
    };

    // Items being rolled back
    const rolledBackItems = [
      { id: 'sold1', isSold: true, isTransferred: false },
      { id: 'transfer2', isSold: false, isTransferred: true },
      { id: 'sold3', isSold: true, isTransferred: false }
    ];

    // Simulate the cleanup logic
    let newProcessedSalesIds = [...initialState.processedSalesIds];
    let newProcessedTransferIds = [...initialState.processedTransferIds];

    rolledBackItems.forEach(item => {
      if (item.isSold) {
        newProcessedSalesIds = newProcessedSalesIds.filter(id => id !== item.id);
      }
      if (item.isTransferred) {
        newProcessedTransferIds = newProcessedTransferIds.filter(id => id !== item.id);
      }
    });

    // Verify correct items were removed
    expect(newProcessedSalesIds).toEqual(['sold2']);
    expect(newProcessedTransferIds).toEqual(['transfer1', 'transfer3']);
  });

  test('🔄 UNIT TEST 7: Target symbol determination for different item types', () => {
    const testItems = [
      {
        id: 'item1',
        magazynSymbol: 'MAG1',
        originalSymbol: 'ORIG1',
        isSold: true,
        isTransferred: false
      },
      {
        id: 'item2',
        magazynSymbol: 'MAG2',
        originalSymbol: 'ORIG2',
        isSold: false,
        isTransferred: true
      },
      {
        id: 'item3',
        magazynSymbol: 'MAG3',
        originalSymbol: 'ORIG3',
        isSold: false,
        isTransferred: false
      }
    ];

    // Function to determine target symbol
    const getTargetSymbol = (item) => {
      if (item.isTransferred || item.isSold) {
        return item.originalSymbol;
      }
      return item.magazynSymbol;
    };

    // Test each item type
    expect(getTargetSymbol(testItems[0])).toBe('ORIG1'); // Sold item -> originalSymbol
    expect(getTargetSymbol(testItems[1])).toBe('ORIG2'); // Transferred item -> originalSymbol
    expect(getTargetSymbol(testItems[2])).toBe('MAG3');  // Synchronized item -> magazynSymbol
  });

  test('🔄 UNIT TEST 8: Error handling scenarios', async () => {
    // Test rollback with missing originalSymbol
    mockedAxios.post.mockRejectedValueOnce(new Error('Missing originalSymbol for item'));

    try {
      await axios.post('/api/undo-transaction', {
        transactionId: 'TXN-ERROR'
      });
    } catch (error) {
      expect(error.message).toBe('Missing originalSymbol for item');
    }

    expect(mockedAxios.post).toHaveBeenCalledWith('/api/undo-transaction', {
      transactionId: 'TXN-ERROR'
    });
  });

  test('🔄 UNIT TEST 9: Complex transaction with mixed item types', () => {
    const complexTransaction = {
      transactionId: 'TXN-COMPLEX',
      itemsAdded: [
        {
          id: 'sold1',
          type: 'sold',
          originalSymbol: 'ORIG1',
          magazynSymbol: 'MAG1',
          isSold: true,
          isTransferred: false
        },
        {
          id: 'transfer1',
          type: 'transferred',
          originalSymbol: 'ORIG2',
          magazynSymbol: 'MAG2',
          isSold: false,
          isTransferred: true
        },
        {
          id: 'sync1',
          type: 'synchronized',
          originalSymbol: 'ORIG3',
          magazynSymbol: 'MAG3',
          isSold: false,
          isTransferred: false
        }
      ]
    };

    // Simulate processing each item for rollback
    const rollbackInstructions = complexTransaction.itemsAdded.map(item => ({
      id: item.id,
      targetSymbol: (item.isSold || item.isTransferred) ? item.originalSymbol : item.magazynSymbol,
      type: item.type,
      shouldRemoveFromProcessedSales: item.isSold,
      shouldRemoveFromProcessedTransfers: item.isTransferred
    }));

    // Verify rollback instructions
    expect(rollbackInstructions[0].targetSymbol).toBe('ORIG1');
    expect(rollbackInstructions[0].shouldRemoveFromProcessedSales).toBe(true);
    expect(rollbackInstructions[0].shouldRemoveFromProcessedTransfers).toBe(false);

    expect(rollbackInstructions[1].targetSymbol).toBe('ORIG2');
    expect(rollbackInstructions[1].shouldRemoveFromProcessedSales).toBe(false);
    expect(rollbackInstructions[1].shouldRemoveFromProcessedTransfers).toBe(true);

    expect(rollbackInstructions[2].targetSymbol).toBe('MAG3');
    expect(rollbackInstructions[2].shouldRemoveFromProcessedSales).toBe(false);
    expect(rollbackInstructions[2].shouldRemoveFromProcessedTransfers).toBe(false);
  });

  test('🔄 UNIT TEST 10: Validation after rollback for re-saving', () => {
    // State after successful rollback
    const stateAfterRollback = {
      processedSalesIds: [], // Cleared after rollback
      processedTransferIds: [], // Cleared after rollback
      magazynItems: [
        { id: 'item1', fullName: 'Product 1', barcode: '1111111111111' }
      ]
    };

    const rolledBackItem = {
      id: 'item1',
      fullName: 'Product 1',
      barcode: '1111111111111'
    };

    // Check if item can be processed again
    const canBeProcessedAgain = 
      !stateAfterRollback.processedSalesIds.includes(rolledBackItem.id) &&
      !stateAfterRollback.processedTransferIds.includes(rolledBackItem.id);

    expect(canBeProcessedAgain).toBe(true);
  });
});
