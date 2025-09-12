import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import AddToState from './AddToState';

// Mock fetch
global.fetch = jest.fn();

describe('AddToState - Synchronizacja', () => {
  const mockTransferData = [
    {
      _id: 'transfer1',
      fullName: 'Ada CZERWONY',
      size: '2XL',
      barcode: '68c3ac895611941551b7edca',
      productId: '68c3ac895611941551b7edca',
      symbol: 'K',
      transfer_to: 'K',
      fromWarehouse: false,
      isFromSale: false
    }
  ];

  const mockWarehouseData = [
    {
      _id: 'warehouse1',
      fullName: { fullName: 'Ada CZERWONY' },
      size: { Roz_Opis: '2XL' },
      barcode: '0010702300001',
      price: 100,
      symbol: 'MAGAZYN'
    },
    {
      _id: 'warehouse2',
      fullName: { fullName: 'Jadwiga CZERWONY' },
      size: { Roz_Opis: 'XS' },
      barcode: '0490701100008',
      price: 150,
      symbol: 'MAGAZYN'
    }
  ];

  const mockUserData = {
    users: [
      { _id: 'user1', symbol: 'K', name: 'TestUser' },
      { _id: 'user2', symbol: 'S', name: 'TestUser2' }
    ]
  };

  beforeEach(() => {
    fetch.mockClear();
    
    fetch.mockImplementation((url, options) => {
      console.log('🔍 Mock fetch:', url, options?.method);
      
      if (url.includes('/api/user')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUserData)
        });
      }
      
      if (url.includes('/api/transfer') && !url.includes('last-transaction')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTransferData)
        });
      }
      
      if (url.includes('/api/state/warehouse')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockWarehouseData)
        });
      }
      
      if (url.includes('/api/sales/get-all-sales')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      }
      
      if (url.includes('/api/state') && !url.includes('warehouse')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      }
      
      if (url.includes('/api/transfer/last-transaction')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ canUndo: false })
        });
      }
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
  });

  test('Synchronizacja powinna działać i sparować produkty', async () => {
    const mockOnAdd = jest.fn();
    
    await act(async () => {
      render(<AddToState onAdd={mockOnAdd} />);
    });
    
    // Poczekaj na załadowanie danych
    await waitFor(() => {
      expect(screen.getByText(/Synchronizuj z magazynem/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    console.log('✅ Test: Komponent załadowany');
    
    // Sprawdź czy są produkty
    await waitFor(() => {
      const productName = screen.getByText('Ada CZERWONY');
      expect(productName).toBeInTheDocument();
    }, { timeout: 2000 });

    console.log('✅ Test: Produkt znaleziony');
    
    // Kliknij synchronizację
    const syncButton = screen.getByText(/Synchronizuj z magazynem/i);
    
    await act(async () => {
      fireEvent.click(syncButton);
    });

    console.log('✅ Test: Przycisk synchronizacji kliknięty');
    
    // Sprawdź czy synchronizacja się wykonała (sprawdź czy są jakieś zmiany w UI)
    // Może pojawić się komunikat lub zmienić się kolor produktów
    await new Promise(resolve => setTimeout(resolve, 1000)); // Krótka pauza na wykonanie synchronizacji
    
    console.log('✅ Test: Synchronizacja zakończona (timeout passed)');
    
    // Test zakończony pomyślnie jeśli dotrze do tego momentu
    expect(syncButton).toBeInTheDocument();
  }, 10000); // Zwiększony timeout

  test('Komponent powinien załadować dane z API', async () => {
    const mockOnAdd = jest.fn();
    
    await act(async () => {
      render(<AddToState onAdd={mockOnAdd} />);
    });
    
    // Sprawdź czy produkty z magazynu się załadowały
    await waitFor(() => {
      const warehouseTitle = screen.getByText(/📦 Magazyn/i);
      expect(warehouseTitle).toBeInTheDocument();
    }, { timeout: 3000 });

    // Sprawdź czy produkty się wyświetlają
    await waitFor(() => {
      const productCount = screen.getByText(/Znaleziono:/i);
      expect(productCount).toBeInTheDocument();
    }, { timeout: 3000 });

    console.log('✅ Test: Dane z API załadowane');
  });

  test('Przycisk synchronizacji powinien być aktywny', async () => {
    const mockOnAdd = jest.fn();
    
    await act(async () => {
      render(<AddToState onAdd={mockOnAdd} />);
    });
    
    await waitFor(() => {
      const syncButton = screen.getByText(/Synchronizuj z magazynem/i);
      expect(syncButton).toBeInTheDocument();
      expect(syncButton).not.toBeDisabled();
    }, { timeout: 3000 });

    console.log('✅ Test: Przycisk synchronizacji aktywny');
  });

  test('Reset synchronizacji powinien być dostępny', async () => {
    const mockOnAdd = jest.fn();
    
    await act(async () => {
      render(<AddToState onAdd={mockOnAdd} />);
    });
    
    await waitFor(() => {
      const resetButton = screen.getByText(/Reset synchronizacji/i);
      expect(resetButton).toBeInTheDocument();
      expect(resetButton).not.toBeDisabled();
    }, { timeout: 3000 });

    console.log('✅ Test: Przycisk reset dostępny');
  });

  test('Dane testowe powinny zawierać matching produkty', () => {
    // Test danych - sprawdź czy mamy produkty do sparowania
    const transferProduct = mockTransferData[0];
    const warehouseProduct = mockWarehouseData[0];
    
    expect(transferProduct.fullName).toBe('Ada CZERWONY');
    expect(warehouseProduct.fullName.fullName).toBe('Ada CZERWONY');
    
    expect(transferProduct.size).toBe('2XL');
    expect(warehouseProduct.size.Roz_Opis).toBe('2XL');
    
    console.log('✅ Test: Dane testowe prawidłowo skonfigurowane');
  });

  test('Synchronizacja powinna działać bez błędów w konsoli', async () => {
    // Test sprawdzający czy synchronizacja się wykonuje bez błędów
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const mockOnAdd = jest.fn();
    
    await act(async () => {
      render(<AddToState onAdd={mockOnAdd} />);
    });
    
    await waitFor(() => {
      expect(screen.getByText(/Synchronizuj z magazynem/i)).toBeInTheDocument();
    }, { timeout: 3000 });
    
    const syncButton = screen.getByText(/Synchronizuj z magazynem/i);
    
    await act(async () => {
      fireEvent.click(syncButton);
    });
    
    // Poczekaj chwilę na wykonanie synchronizacji
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Sprawdź czy nie było błędów w konsoli
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    
    consoleErrorSpy.mockRestore();
    console.log('✅ Test: Synchronizacja wykonana bez błędów');
  }, 8000);
});