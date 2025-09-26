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
    if (url.includes('/api/state/warehouse')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
          {
            _id: 'warehouse1',
            fullName: { fullName: 'Kurtka Testowa A' },
            size: { Roz_Opis: 'M' },
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
            transfer_from: 'PUNKT1',
            transfer_to: 'PUNKT2',
            processed: false,
            date: new Date().toISOString()
          }
        ])
      });
    }
    if (url.includes('/api/sales/get-all-sales')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
          {
            _id: 'sales1',
            fullName: 'Kurtka Testowa A',
            size: 'M',
            barcode: '123456789',
            isFromSale: true,
            cash: [{ price: 80, currency: 'PLN' }],
            transfer_to: 'PUNKT1',
            date: new Date().toISOString()
          }
        ])
      });
    }
    if (url.includes('/api/user')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          users: [
            { _id: 'user1', symbol: 'PUNKT1', sellingPoint: 'Punkt 1' },
            { _id: 'user2', symbol: 'PUNKT2', sellingPoint: 'Punkt 2' }
          ]
        })
      });
    }
    if (url.includes('/api/state') && !url.includes('warehouse')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
          {
            _id: 'state1',
            fullName: 'Kurtka Testowa A',
            size: 'M',
            barcode: '123456789',
            sellingPoint: 'user1'
          }
        ])
      });
    }
    if (url.includes('/api/transfer/process-sales')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ processedCount: 1 })
      });
    }
    if (url.includes('/api/transfer/process-warehouse')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ processedCount: 1 })
      });
    }
    if (url.includes('/api/transfer/process-all')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ processedCount: 1 })
      });
    }
    if (url.includes('/api/transfer/last-transaction')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ 
          hasLastTransaction: false,
          transactionId: null,
          timestamp: null,
          itemCount: 0
        })
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

describe('AddToState - Zielone produkty (operacja podwójna)', () => {
  test('przycisk przetwarzania jest dostępny', async () => {
    render(<AddToState />);

    // Sprawdź czy przycisk przetwarzania jest dostępny
    expect(screen.getByText(/Zapisz - Odpisz wszystkie kurtki ze stanu/)).toBeInTheDocument();
  });

  test('obsługa wyboru użytkownika', async () => {
    render(<AddToState />);

    // Poczekaj na załadowanie użytkowników
    await waitFor(() => {
      const userSelect = screen.getByLabelText('Wybierz użytkownika:');
      expect(userSelect).toBeInTheDocument();
    });

    // Wybierz użytkownika
    const userSelect = screen.getByLabelText('Wybierz użytkownika:');
    
    // Sprawdź czy opcje użytkowników są dostępne
    await waitFor(() => {
      expect(screen.getByText('PUNKT1 - Punkt 1')).toBeInTheDocument();
    });

    fireEvent.change(userSelect, { target: { value: 'user1' } });

    // Sprawdź czy użytkownik został wybrany
    expect(userSelect.value).toBe('user1');
  });
});
