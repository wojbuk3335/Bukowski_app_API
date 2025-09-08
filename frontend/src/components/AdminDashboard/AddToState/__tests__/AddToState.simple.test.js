import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import AddToState from '../AddToState';

// Mock API
global.fetch = jest.fn();

describe('AddToState - Simple Integration Test', () => {
  const mockUsers = [
    { _id: 'user1', symbol: 'TestUser', name: 'Test User', email: 'test@example.com' },
    { _id: 'user2', symbol: 'Admin', name: 'Administrator', email: 'admin@example.com' }
  ];

  const mockYellowTransfer = {
    _id: 'yellow-transfer-1',
    transfer_from: 'Magazyn A',
    transfer_to: 'TestUser',
    fullName: 'Yellow Test Product',
    size: 'L',
    barcode: 'INCOMING_123456',
    price: 150,
    date: '2025-08-31',
    processed: false,
    isIncomingTransfer: true
  };

  beforeEach(() => {
    fetch.mockClear();
    jest.clearAllMocks();
    
    // Mock responses in the correct order:
    // 1. fetchUsers() -> users
    // 2. fetchTransfers() -> transfers  
    // 3. fetchWarehouseItems() -> warehouse
    // 4. fetchSales() -> sales
    // 5. fetchAllStates() -> state
    // 6. checkLastTransaction() -> lastTransaction
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: mockUsers }) // Wrap in users object
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [mockYellowTransfer]
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => []
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => []
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => []
      })
      .mockResolvedValueOnce({
        status: 404,
        json: async () => ({ message: 'No transaction found' })
      });
  });

  test('Component loads and shows users in select', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    // Wait for users to be loaded  
    await waitFor(() => {
      expect(screen.getByText('TestUser - test@example.com')).toBeInTheDocument();
    });

    // Check if the select has the expected options
    const userSelect = screen.getByLabelText(/select user/i);
    expect(userSelect).toBeInTheDocument();
    
    // Now select a user
    await act(async () => {
      fireEvent.change(userSelect, { target: { value: 'user1' } });
    });

    // Wait for data to be filtered and transfers to show
    await waitFor(() => {
      // Look for the transfer in the table
      expect(screen.getByText('Yellow Test Product')).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Check if it has the correct yellow background color
    const productElement = screen.getByText('Yellow Test Product');
    const productRow = productElement.closest('tr');
    expect(productRow).toHaveStyle({ backgroundColor: 'rgb(255, 193, 7)' });
  });
});
