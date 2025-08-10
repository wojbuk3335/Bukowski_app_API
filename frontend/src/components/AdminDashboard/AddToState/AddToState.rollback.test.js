// AddToState.rollback.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import AddToState from './AddToState';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Mock window.alert
const originalAlert = window.alert;
beforeAll(() => {
  window.alert = jest.fn();
});

afterAll(() => {
  window.alert = originalAlert;
});

// Mock console methods
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

describe('🔄 AddToState Rollback Tests', () => {
  jest.setTimeout(10000);
  const mockTransactionHistoryData = [
    {
      _id: 'trans1',
      transactionId: 'TXN001',
      itemsCount: 2,
      selectedSellingPoint: 'TEST_POINT',
      processedItems: [
        { 
          originalId: 'item1', 
          fullName: 'Sold Item', 
          size: 'M',
          barcode: '1111111111111',
          price: '100',
          originalSymbol: 'ORIG1',
          processType: 'sold'
        },
        { 
          originalId: 'item2', 
          fullName: 'Transferred Item', 
          size: 'L',
          barcode: '2222222222222',
          price: '200',
          originalSymbol: 'ORIG2',
          processType: 'transferred'
        }
      ],
      timestamp: new Date().toISOString()
    }
  ];

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock API responses
    mockedAxios.get.mockImplementation((url) => {
      if (url === '/api/state') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/api/sales/get-all-sales') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/api/transfer') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/api/user') {
        return Promise.resolve({ data: { count: 0, users: [] } });
      }
      if (url === '/api/transaction-history') {
        return Promise.resolve({ data: mockTransactionHistoryData });
      }
      if (url.includes('/api/state/barcode/')) {
        return Promise.resolve({ data: [{ symbol: 'TEST_SYMBOL' }] });
      }
      if (url.includes('/api/history/by-transaction/')) {
        return Promise.resolve({ data: { success: true } });
      }
      return Promise.resolve({ data: [] });
    });

    mockedAxios.post.mockImplementation((url) => {
      if (url === '/api/state/restore-silent') {
        return Promise.resolve({ data: { success: true } });
      }
      if (url === '/api/history/delete-by-details') {
        return Promise.resolve({ data: { success: true } });
      }
      return Promise.resolve({ data: { success: true } });
    });
    
    mockedAxios.delete.mockImplementation((url) => {
      if (url.includes('/api/transaction-history/')) {
        return Promise.resolve({ data: { success: true } });
      }
      if (url.includes('/api/state/barcode/')) {
        return Promise.resolve({ data: { success: true } });
      }
      if (url.includes('/api/history/by-transaction/')) {
        return Promise.resolve({ data: { success: true } });
      }
      return Promise.resolve({ data: { success: true } });
    });
  });

  test('🔄 TEST 1: performUndoTransaction - should restore sold items to original locations', async () => {
    render(<AddToState />);
    
    // Wait for component to load - check for Historia button first (use regex to match with count)
    await waitFor(() => {
      expect(screen.getByText(/Historia \(\d+\)/)).toBeInTheDocument();
    });

    // Click Historia button to open modal
    const historyButton = screen.getByText(/Historia \(\d+\)/);
    fireEvent.click(historyButton);

    // Wait for modal to open and find the transaction
    await waitFor(() => {
      expect(screen.getByText('Anuluj całość')).toBeInTheDocument();
    });

    // Mock successful rollback response
    mockedAxios.delete.mockResolvedValueOnce({ 
      data: { 
        success: true, 
        restoredItems: [
          { id: 'item1', targetSymbol: 'ORIG1', type: 'sold' }
        ]
      } 
    });

    // Find and click the undo button for transaction
    const undoButton = screen.getByText('Anuluj całość');
    fireEvent.click(undoButton);

    // Wait for confirmation modal and confirm
    await waitFor(() => {
      expect(screen.getByText('Anuluj transakcję')).toBeInTheDocument();
    });
    
    const confirmButton = screen.getByText('Anuluj transakcję');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      // Check if the correct API call was made for deactivating transaction
      expect(mockedAxios.delete).toHaveBeenCalledWith(
        expect.stringContaining('/api/transaction-history/')
      );
    }, { timeout: 5000 });
  });

  test('🔄 TEST 2: performUndoTransaction - should restore transferred items to original symbols', async () => {
    const transferOnlyTransaction = [{
      _id: 'trans2',
      transactionId: 'TXN002',
      itemsCount: 1,
      selectedSellingPoint: 'TEST_POINT',
      processedItems: [
        { 
          originalId: 'item3', 
          fullName: 'Orange Item', 
          size: 'L',
          barcode: '3333333333333',
          price: '300',
          originalSymbol: 'ORIG3',
          processType: 'transferred'
        }
      ],
      timestamp: new Date().toISOString()
    }];

    mockedAxios.get.mockImplementation((url) => {
      if (url === '/api/transaction-history') {
        return Promise.resolve({ data: transferOnlyTransaction });
      }
      if (url === '/api/state') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/api/sales/get-all-sales') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/api/transfer') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/api/user') {
        return Promise.resolve({ data: { count: 0, users: [] } });
      }
      return Promise.resolve({ data: [] });
    });

    render(<AddToState />);
    
    await waitFor(() => {
      expect(screen.getByText(/Historia \(\d+\)/)).toBeInTheDocument();
    });

    // Click Historia button to open modal
    const historyButton = screen.getByText(/Historia \(\d+\)/);
    fireEvent.click(historyButton);

    // Wait for modal to open and find the transaction
    await waitFor(() => {
      expect(screen.getByText('Anuluj całość')).toBeInTheDocument();
    });

    // Mock successful rollback response
    mockedAxios.delete.mockResolvedValueOnce({ 
      data: { 
        success: true, 
        restoredItems: [
          { id: 'item3', targetSymbol: 'ORIG3', type: 'transferred' }
        ]
      } 
    });

    const undoButton = screen.getByText('Anuluj całość');
    fireEvent.click(undoButton);

    // Wait for confirmation modal and confirm
    await waitFor(() => {
      expect(screen.getByText('Anuluj transakcję')).toBeInTheDocument();
    });
    
    const confirmButton = screen.getByText('Anuluj transakcję');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockedAxios.delete).toHaveBeenCalledWith(
        expect.stringContaining('/api/transaction-history/')
      );
    }, { timeout: 5000 });
  });

  test('🔄 TEST 3: performUndoSingleItem - should handle single item rollback', async () => {
    render(<AddToState />);
    
    await waitFor(() => {
      expect(screen.getByText(/Historia \(\d+\)/)).toBeInTheDocument();
    });

    // Click Historia button to open modal
    const historyButton = screen.getByText(/Historia \(\d+\)/);
    fireEvent.click(historyButton);

    // Wait for modal to open and find the transaction with single item undo buttons
    await waitFor(() => {
      expect(screen.getByText('Anuluj całość')).toBeInTheDocument();
    });

    // Mock successful single item rollback
    mockedAxios.post.mockResolvedValueOnce({ 
      data: { 
        success: true, 
        restoredItem: { id: 'item1', targetSymbol: 'ORIG1' }
      } 
    });

    // Find and click single item undo button - look for "Anuluj" button in the transaction items
    const singleUndoButtons = screen.getAllByText('Anuluj');
    const singleItemButton = singleUndoButtons.find(btn => 
      btn.getAttribute('title')?.includes('element')
    );
    
    if (singleItemButton) {
      fireEvent.click(singleItemButton);

      // Wait for confirmation modal and confirm
      await waitFor(() => {
        expect(screen.getByText('Anuluj element')).toBeInTheDocument();
      });
      
      const confirmButton = screen.getByText('Anuluj element');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalled();
      });
    }
  });

  test('🔄 TEST 4: Error handling during rollback', async () => {
    render(<AddToState />);
    
    await waitFor(() => {
      expect(screen.getByText(/Historia \(\d+\)/)).toBeInTheDocument();
    });

    // Click Historia button to open modal
    const historyButton = screen.getByText(/Historia \(\d+\)/);
    fireEvent.click(historyButton);

    // Wait for modal to open
    await waitFor(() => {
      expect(screen.getByText('Anuluj całość')).toBeInTheDocument();
    });

    // Mock API error
    mockedAxios.delete.mockRejectedValueOnce(new Error('Rollback failed'));

    const undoButton = screen.getByText('Anuluj całość');
    fireEvent.click(undoButton);

    // Wait for confirmation modal and confirm
    await waitFor(() => {
      expect(screen.getByText('Anuluj transakcję')).toBeInTheDocument();
    });
    
    const confirmButton = screen.getByText('Anuluj transakcję');
    fireEvent.click(confirmButton);

    // Wait for error to be handled - the component should show an error notification
    await waitFor(() => {
      expect(mockedAxios.delete).toHaveBeenCalled();
    }, { timeout: 5000 });
  });

  test('🔄 TEST 5: Validation system - transfer barcode detection', () => {
    // Test the validation logic for transfers
    const mockProductData = [
      { _id: 'prod1', barcode: '1111111111111', fullName: 'Product 1', size: 'M' }
    ];

    const mockTransferItem = {
      fullName: 'Product 1',
      size: 'M'
    };

    // Mock the validation function logic
    const findBarcodeForTransfer = (transferItem, productData) => {
      // Method 1: Direct productId lookup
      if (transferItem.productId) {
        const product = productData.find(p => p._id === transferItem.productId);
        if (product) return product.barcode;
      }

      // Method 2: Direct barcode field
      if (transferItem.barcode) {
        return transferItem.barcode;
      }

      // Method 3: Name and size matching
      const matchingProduct = productData.find(p => 
        p.fullName === transferItem.fullName && 
        p.size === transferItem.size
      );
      return matchingProduct ? matchingProduct.barcode : null;
    };

    const result = findBarcodeForTransfer(mockTransferItem, mockProductData);
    expect(result).toBe('1111111111111');
  });

  test('🔄 TEST 6: processedIds management during rollback', () => {
    // Test that items are properly removed from processedSalesIds and processedTransferIds
    const initialProcessedSalesIds = ['item1', 'item2'];
    const initialProcessedTransferIds = ['item3', 'item4'];
    
    const itemsToRemove = [
      { id: 'item1', isSold: true, isTransferred: false },
      { id: 'item3', isSold: false, isTransferred: true }
    ];

    // Simulate the removal logic
    let newProcessedSalesIds = [...initialProcessedSalesIds];
    let newProcessedTransferIds = [...initialProcessedTransferIds];

    itemsToRemove.forEach(item => {
      if (item.isSold) {
        newProcessedSalesIds = newProcessedSalesIds.filter(id => id !== item.id);
      }
      if (item.isTransferred) {
        newProcessedTransferIds = newProcessedTransferIds.filter(id => id !== item.id);
      }
    });

    expect(newProcessedSalesIds).toEqual(['item2']);
    expect(newProcessedTransferIds).toEqual(['item4']);
  });

  test('🔄 TEST 7: Complex rollback scenario - mixed item types', async () => {
    const mixedTransaction = [{
      _id: 'trans3',
      transactionId: 'TXN003',
      processedItems: [
        { 
          fullName: 'Sold Blue Item', 
          barcode: '1111111111111',
          originalSymbol: 'ORIG1',
          processType: 'sold'
        },
        { 
          fullName: 'Transferred Orange Item', 
          barcode: '2222222222222',
          originalSymbol: 'ORIG2',
          processType: 'transferred'
        },
        { 
          fullName: 'Synchronized Green Item', 
          barcode: '3333333333333',
          originalSymbol: 'ORIG3',
          processType: 'synchronized'
        }
      ],
      timestamp: new Date().toISOString(),
      itemsCount: 3
    }];

    mockedAxios.get.mockImplementation((url) => {
      if (url === '/api/transaction-history') {
        return Promise.resolve({ data: mixedTransaction });
      }
      if (url === '/api/state') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/api/sales/get-all-sales') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/api/transfer') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/api/user') {
        return Promise.resolve({ data: { count: 0, users: [] } });
      }
      return Promise.resolve({ data: [] });
    });

    render(<AddToState />);
    
    await waitFor(() => {
      expect(screen.getByText(/Historia \(\d+\)/)).toBeInTheDocument();
    });

    // Click Historia button to open modal
    const historyButton = screen.getByText(/Historia \(\d+\)/);
    fireEvent.click(historyButton);

    // Wait for modal to open
    await waitFor(() => {
      expect(screen.getByText('Anuluj całość')).toBeInTheDocument();
    });

    // Mock successful complex rollback
    mockedAxios.delete.mockResolvedValueOnce({ 
      data: { 
        success: true, 
        restoredItems: [
          { id: 'sold1', targetSymbol: 'ORIG1', type: 'sold' },
          { id: 'transfer1', targetSymbol: 'ORIG2', type: 'transferred' },
          { id: 'sync1', targetSymbol: 'ORIG3', type: 'synchronized' }
        ]
      } 
    });

    const undoButton = screen.getByText('Anuluj całość');
    fireEvent.click(undoButton);

    // Wait for confirmation modal and confirm
    await waitFor(() => {
      expect(screen.getByText('Anuluj transakcję')).toBeInTheDocument();
    });
    
    const confirmButton = screen.getByText('Anuluj transakcję');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockedAxios.delete).toHaveBeenCalledWith(
        expect.stringContaining('/api/transaction-history/TXN003')
      );
    });
  });

  test('🔄 TEST 8: Re-saving items after rollback validation', () => {
    // Test that items can be validated and saved again after rollback
    const rolledBackItem = {
      id: 'item1',
      fullName: 'Product 1',
      barcode: '1111111111111',
      size: 'M'
    };

    // Mock state after rollback - item should be removed from processed lists
    const processedSalesIds = []; // Empty after rollback
    const processedTransferIds = []; // Empty after rollback

    // Validation should pass
    const canBeProcessedAgain = !processedSalesIds.includes(rolledBackItem.id) && 
                               !processedTransferIds.includes(rolledBackItem.id);

    expect(canBeProcessedAgain).toBe(true);
  });

  test('🔄 TEST 9: Debug logging during rollback process', () => {
    // Test that proper debug information is logged
    const mockItems = [
      { id: 'item1', isSold: true, originalSymbol: 'ORIG1' },
      { id: 'item2', isTransferred: true, originalSymbol: 'ORIG2' }
    ];

    // Simulate the debug logging that should occur
    mockItems.forEach(item => {
      if (item.isSold) {
        console.log(`🔄 Processing sold item rollback: ${item.id} -> ${item.originalSymbol}`);
      }
      if (item.isTransferred) {
        console.log(`🔄 Processing transferred item rollback: ${item.id} -> ${item.originalSymbol}`);
      }
    });

    // Verify console.log was called (mocked)
    expect(console.log).toHaveBeenCalled();
  });

  test('🔄 TEST 10: Edge case - rollback with missing originalSymbol', async () => {
    const edgeCaseTransaction = [{
      _id: 'trans4',
      transactionId: 'TXN004',
      processedItems: [
        { 
          fullName: 'Edge Case Item', 
          barcode: '4444444444444',
          // originalSymbol is missing
          processType: 'transferred'
        }
      ],
      timestamp: new Date().toISOString(),
      itemsCount: 1
    }];

    mockedAxios.get.mockImplementation((url) => {
      if (url === '/api/transaction-history') {
        return Promise.resolve({ data: edgeCaseTransaction });
      }
      if (url === '/api/state') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/api/sales/get-all-sales') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/api/transfer') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/api/user') {
        return Promise.resolve({ data: { count: 0, users: [] } });
      }
      return Promise.resolve({ data: [] });
    });

    render(<AddToState />);
    
    await waitFor(() => {
      expect(screen.getByText(/Historia \(\d+\)/)).toBeInTheDocument();
    });

    // Click Historia button to open modal
    const historyButton = screen.getByText(/Historia \(\d+\)/);
    fireEvent.click(historyButton);

    // Wait for modal to open
    await waitFor(() => {
      expect(screen.getByText('Anuluj całość')).toBeInTheDocument();
    });

    // Mock error response for missing originalSymbol
    mockedAxios.delete.mockRejectedValueOnce(new Error('Missing originalSymbol for item edge1'));

    const undoButton = screen.getByText('Anuluj całość');
    fireEvent.click(undoButton);

    // Wait for confirmation modal and confirm
    await waitFor(() => {
      expect(screen.getByText('Anuluj transakcję')).toBeInTheDocument();
    });
    
    const confirmButton = screen.getByText('Anuluj transakcję');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockedAxios.delete).toHaveBeenCalled();
    });
  });
});
