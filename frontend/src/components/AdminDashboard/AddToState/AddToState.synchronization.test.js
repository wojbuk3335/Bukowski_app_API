import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddToState from './AddToState';

// Mock fetch dla API
global.fetch = jest.fn();

beforeEach(() => {
  // Mock console.error i alert
  console.error = jest.fn();
  window.alert = jest.fn();
  
  fetch.mockImplementation((url) => {
    if (url.includes('/api/warehouse')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
          {
            _id: 'warehouse1',
            fullName: 'Kurtka Testowa A',
            size: 'M',
            barcode: '123456789',
            price: 100
          }
        ])
      });
    }
    if (url.includes('/api/transfer')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
          {
            _id: 'transfer1',
            fullName: 'Kurtka Testowa A',
            size: 'M',
            productId: '123456789',
            fromWarehouse: false,
            advancePayment: 50,
            currency: 'PLN',
            transfer_from: 'PUNKT1',
            transfer_to: 'PUNKT2',
            processed: false
          }
        ])
      });
    }
    if (url.includes('/api/sales')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([])
      });
    }
    if (url.includes('/api/user')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
          { symbol: 'PUNKT1', name: 'Punkt 1' },
          { symbol: 'PUNKT2', name: 'Punkt 2' }
        ])
      });
    }
    if (url.includes('/api/state')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([])
      });
    }
    if (url.includes('/api/lastTransaction')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ hasLastTransaction: false })
      });
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve([])
    });
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('AddToState - Synchronizacja', () => {
  test('przyciski synchronizacji są dostępne', async () => {
    render(<AddToState />);
    
    await waitFor(() => {
      expect(screen.getByText('🔄 Synchronizuj z magazynem')).toBeInTheDocument();
      expect(screen.getByText('🔄 Reset synchronizacji')).toBeInTheDocument();
    });
  });

  test('funkcjonalność synchronizacji - podstawowy test', async () => {
    render(<AddToState />);

    // Czekamy na załadowanie interfejsu
    await waitFor(() => {
      expect(screen.getByText('Mechanizm Transferów')).toBeInTheDocument();
    });

    // Sprawdzamy czy przycisk synchronizacji istnieje i reaguje na kliknięcie
    const syncButton = screen.getByText('🔄 Synchronizuj z magazynem');
    expect(syncButton).toBeInTheDocument();
    
    // Kliknięcie w przycisk
    fireEvent.click(syncButton);
    
    // Test podstawowy - sprawdzamy czy przycisk nadal istnieje po kliknięciu
    expect(syncButton).toBeInTheDocument();
  });

  test('funkcjonalność reset synchronizacji', async () => {
    render(<AddToState />);

    await waitFor(() => {
      expect(screen.getByText('🔄 Reset synchronizacji')).toBeInTheDocument();
    });

    const resetButton = screen.getByText('🔄 Reset synchronizacji');
    fireEvent.click(resetButton);
    
    // Test podstawowy - sprawdzamy czy przycisk nadal istnieje po kliknięciu
    expect(resetButton).toBeInTheDocument();
  });
});
