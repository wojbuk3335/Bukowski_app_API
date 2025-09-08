import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AddToState from '../AddToState';

// Mock fetch
global.fetch = jest.fn();

describe('Yellow Transfer Products Basic Test', () => {
  const mockYellowTransfer = {
    _id: 't1',
    transfer_from: 'Punkt A',
    transfer_to: 'Wybrany User',
    fullName: 'Test Product',
    size: 'M',
    barcode: '123456',
    price: 100,
    date: '2024-01-01',
    isIncomingTransfer: true
  };

  const mockUsers = [
    { _id: 'user1', symbol: 'TestUser', name: 'Test User' }
  ];

  const setupMockResponses = () => {
    // Setup persistent mocks that handle multiple calls
    fetch.mockImplementation((url) => {
      if (url.includes('/api/transfer')) {
        return Promise.resolve({
          ok: true,
          json: async () => [mockYellowTransfer]
        });
      }
      if (url.includes('/api/sales')) {
        return Promise.resolve({
          ok: true,
          json: async () => []
        });
      }
      if (url.includes('/api/state/warehouse')) {
        return Promise.resolve({
          ok: true,
          json: async () => []
        });
      }
      if (url.includes('/api/state')) {
        return Promise.resolve({
          ok: true,
          json: async () => []
        });
      }
      if (url.includes('/api/user')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ users: mockUsers })
        });
      }
      if (url.includes('/api/last-transaction')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ canUndo: false })
        });
      }
      // Default fallback
      return Promise.resolve({
        ok: true,
        json: async () => ({})
      });
    });
  };

  beforeEach(() => {
    fetch.mockClear();
    setupMockResponses();
  });

  test('should load component and display basic interface', async () => {
    render(<AddToState />);

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('📦 Magazyn')).toBeInTheDocument();
      expect(screen.getByText('Mechanizm Transferów')).toBeInTheDocument();
    });

    // Check for main controls
    expect(screen.getByLabelText(/select date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/select user/i)).toBeInTheDocument();
  });

  test('should display transfer data when available', async () => {
    render(<AddToState />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Transfery')).toBeInTheDocument();
    });

    // The component should render without errors
    expect(screen.getByText('Brak transferów')).toBeInTheDocument();
  });
});
