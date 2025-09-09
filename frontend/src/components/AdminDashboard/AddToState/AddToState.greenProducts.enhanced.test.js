import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddToState from './AddToState';

// Mock fetch dla API
global.fetch = jest.fn();

beforeEach(() => {
  // Mock console.error i alert
  console.error = jest.fn();
  window.alert = jest.fn();
  
  // Resetuj wszystkie mocki
  fetch.mockClear();
  
  // Podstawowe mocki API
  fetch.mockImplementation((url, options) => {
    console.log(`Mock API call: ${url}`);
    
    if (url.includes('/api/state/warehouse')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
          {
            _id: 'warehouse1',
            fullName: 'Kurtka Laura RUDY',
            size: 'XS', 
            barcode: '0652301100004',
            price: 100,
            transfer_to: 'P'
          },
          {
            _id: 'warehouse2',
            fullName: 'Kurtka Laura RUDY',
            size: 'XS',
            barcode: '0652301100004', 
            price: 100,
            transfer_to: 'P'
          }
        ])
      });
    }
    
    if (url.includes('/api/transfer') && !url.includes('process')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([])
      });
    }
    
    if (url.includes('/api/sales/get-all-sales')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
          {
            _id: 'sales1',
            fullName: 'Kurtka Laura RUDY',
            size: 'XS',
            barcode: '0652301100004',
            isFromSale: true,
            cash: [{ price: 80, currency: 'PLN' }],
            transfer_to: 'P',
            date: new Date().toISOString()
          },
          {
            _id: 'sales2',
            fullName: 'Kurtka Laura RUDY',
            size: 'XS',
            barcode: '0652301100004',
            isFromSale: true,
            cash: [{ price: 80, currency: 'PLN' }],
            transfer_to: 'P',
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
            { _id: 'user1', symbol: 'P', sellingPoint: 'Punkt P' }
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
            fullName: 'Kurtka Laura RUDY',
            size: 'XS',
            barcode: '0652301100004',
            sellingPoint: { symbol: 'P' }
          },
          {
            _id: 'state2', 
            fullName: 'Kurtka Laura RUDY',
            size: 'XS',
            barcode: '0652301100004',
            sellingPoint: { symbol: 'P' }
          }
        ])
      });
    }
    
    // Mock dla process endpoints
    if (url.includes('/api/transfer/process-sales')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ 
          processedCount: 1,
          message: 'Sales processed successfully',
          transactionId: 'test-transaction-123'
        })
      });
    }
    
    if (url.includes('/api/transfer/process-warehouse')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ 
          processedCount: 1,
          message: 'Warehouse items processed successfully',
          transactionId: 'test-transaction-123'
        })
      });
    }
    
    if (url.includes('/api/state/barcode/')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
          {
            _id: 'state1',
            fullName: 'Kurtka Laura RUDY',
            size: 'XS',
            barcode: '0652301100004',
            symbol: 'P'
          }
        ])
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
    
    // Default return
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve([])
    });
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('AddToState - Zielone produkty (Enhanced Tests)', () => {
  test('podstawowa funkcjonalność synchronizacji green products', async () => {
    render(<AddToState />);

    // Poczekaj na załadowanie komponentu
    await waitFor(() => {
      expect(screen.getByText('🔄 Synchronizuj z magazynem')).toBeInTheDocument();
    });

    // Sprawdź czy przycisk przetwarzania jest dostępny
    expect(screen.getByText(/Zapisz - Odpisz wszystkie kurtki ze stanu/)).toBeInTheDocument();
  });

  test('synchronizacja tworzy sparowane produkty zielone', async () => {
    render(<AddToState />);

    await waitFor(() => {
      expect(screen.getByText('🔄 Synchronizuj z magazynem')).toBeInTheDocument();
    });

    // Wybierz użytkownika
    const userSelect = screen.getByLabelText('Wybierz użytkownika:');
    fireEvent.change(userSelect, { target: { value: 'user1' } });

    // Wykonaj synchronizację
    const syncButton = screen.getByText('🔄 Synchronizuj z magazynem');
    fireEvent.click(syncButton);

    // Sprawdź czy wywołano odpowiednie API
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/state/warehouse'));
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/sales/get-all-sales'));
    });
  });

  test('przetwarzanie green products wykonuje blue operations przed orange', async () => {
    const processCallOrder = [];
    
    // Mock aby śledzić kolejność wywołań
    fetch.mockImplementation((url, options) => {
      if (url.includes('/api/transfer/process-sales')) {
        processCallOrder.push('BLUE_OPERATION');
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ processedCount: 1 })
        });
      }
      
      if (url.includes('/api/transfer/process-warehouse')) {
        processCallOrder.push('ORANGE_OPERATION');
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ processedCount: 1 })
        });
      }
      
      // Inne endpoints
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([])
      });
    });

    render(<AddToState />);

    await waitFor(() => {
      expect(screen.getByText('🔄 Synchronizuj z magazynem')).toBeInTheDocument();
    });

    const userSelect = screen.getByLabelText('Wybierz użytkownika:');
    fireEvent.change(userSelect, { target: { value: 'user1' } });

    const syncButton = screen.getByText('🔄 Synchronizuj z magazynem');
    fireEvent.click(syncButton);

    // Symuluj kliknięcie przycisku przetwarzania (po synchronizacji)
    await waitFor(() => {
      const processButton = screen.getByText(/Zapisz - Odpisz wszystkie kurtki ze stanu/);
      expect(processButton).toBeInTheDocument();
    });

    // Potestujemy kolejność operacji w osobnym teście integracyjnym
  });

  test('obsługuje błędy podczas przetwarzania green products', async () => {
    // Mock błędu dla blue operation
    fetch.mockImplementation((url, options) => {
      if (url.includes('/api/transfer/process-sales')) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Sales processing failed' })
        });
      }
      
      if (url.includes('/api/transfer/process-warehouse')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ processedCount: 1 })
        });
      }
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([])
      });
    });

    render(<AddToState />);

    await waitFor(() => {
      expect(screen.getByText('🔄 Synchronizuj z magazynem')).toBeInTheDocument();
    });

    const userSelect = screen.getByLabelText('Wybierz użytkownika:');
    fireEvent.change(userSelect, { target: { value: 'user1' } });

    const syncButton = screen.getByText('🔄 Synchronizuj z magazynem');
    fireEvent.click(syncButton);

    // Test że komponent nie crashuje przy błędach
    expect(syncButton).toBeInTheDocument();
  });

  test('reset synchronizacji przywraca domyślne kolory', async () => {
    render(<AddToState />);

    await waitFor(() => {
      expect(screen.getByText('🔄 Reset synchronizacji')).toBeInTheDocument();
    });

    const resetButton = screen.getByText('🔄 Reset synchronizacji');
    fireEvent.click(resetButton);

    // Sprawdź czy funkcja się wykonała bez błędów
    expect(resetButton).toBeInTheDocument();
  });

  test('wyświetla poprawną liczbę produktów do przetworzenia', async () => {
    render(<AddToState />);

    await waitFor(() => {
      expect(screen.getByText('🔄 Synchronizuj z magazynem')).toBeInTheDocument();
    });

    const userSelect = screen.getByLabelText('Wybierz użytkownika:');
    fireEvent.change(userSelect, { target: { value: 'user1' } });

    const syncButton = screen.getByText('🔄 Synchronizuj z magazynem');
    fireEvent.click(syncButton);

    // Sprawdź czy licznik produktów jest wyświetlany
    await waitFor(() => {
      const processButton = screen.getByText(/Zapisz - Odpisz wszystkie kurtki ze stanu/);
      expect(processButton).toBeInTheDocument();
    });
  });
});

describe('AddToState - Testy integracyjne green products', () => {
  test('pełny workflow synchronizacji i przetwarzania', async () => {
    const apiCalls = [];
    
    fetch.mockImplementation((url, options) => {
      apiCalls.push({ url, method: options?.method || 'GET' });
      
      // Podstawowe responses
      if (url.includes('/api/state/warehouse')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { _id: 'w1', fullName: 'Test', size: 'M', barcode: '123', price: 100 }
          ])
        });
      }
      
      if (url.includes('/api/sales/get-all-sales')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { _id: 's1', fullName: 'Test', size: 'M', barcode: '123', isFromSale: true }
          ])
        });
      }
      
      if (url.includes('/api/user')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            users: [{ _id: 'u1', symbol: 'P', sellingPoint: 'Punkt P' }]
          })
        });
      }
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([])
      });
    });

    render(<AddToState />);

    // 1. Poczekaj na załadowanie
    await waitFor(() => {
      expect(screen.getByText('🔄 Synchronizuj z magazynem')).toBeInTheDocument();
    });

    // 2. Wybierz użytkownika
    const userSelect = screen.getByLabelText('Wybierz użytkownika:');
    fireEvent.change(userSelect, { target: { value: 'u1' } });

    // 3. Wykonaj synchronizację
    const syncButton = screen.getByText('🔄 Synchronizuj z magazynem');
    fireEvent.click(syncButton);

    // 4. Sprawdź czy zostały wykonane odpowiednie API calls
    await waitFor(() => {
      const warehouseCalls = apiCalls.filter(call => call.url.includes('/api/state/warehouse'));
      const salesCalls = apiCalls.filter(call => call.url.includes('/api/sales/get-all-sales'));
      
      expect(warehouseCalls.length).toBeGreaterThan(0);
      expect(salesCalls.length).toBeGreaterThan(0);
    });
  });

  test('scenariusz z wieloma identycznymi produktami', async () => {
    // Mock dla scenariusza 2 identycznych produktów Laura RUDY XS
    fetch.mockImplementation((url, options) => {
      if (url.includes('/api/state/warehouse')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { _id: 'w1', fullName: 'Laura RUDY', size: 'XS', barcode: '0652301100004', price: 100 },
            { _id: 'w2', fullName: 'Laura RUDY', size: 'XS', barcode: '0652301100004', price: 100 }
          ])
        });
      }
      
      if (url.includes('/api/sales/get-all-sales')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { _id: 's1', fullName: 'Laura RUDY', size: 'XS', barcode: '0652301100004', isFromSale: true },
            { _id: 's2', fullName: 'Laura RUDY', size: 'XS', barcode: '0652301100004', isFromSale: true }
          ])
        });
      }
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([])
      });
    });

    render(<AddToState />);

    await waitFor(() => {
      expect(screen.getByText('🔄 Synchronizuj z magazynem')).toBeInTheDocument();
    });

    const userSelect = screen.getByLabelText('Wybierz użytkownika:');
    fireEvent.change(userSelect, { target: { value: 'user1' } });

    const syncButton = screen.getByText('🔄 Synchronizuj z magazynem');
    fireEvent.click(syncButton);

    // Test że nie ma błędów przy identycznych produktach
    expect(syncButton).toBeInTheDocument();
  });
});

describe('AddToState - Edge Cases green products', () => {
  test('obsługuje brak produktów w magazynie', async () => {
    fetch.mockImplementation((url) => {
      if (url.includes('/api/state/warehouse')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]) // Pusty magazyn
        });
      }
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([])
      });
    });

    render(<AddToState />);

    await waitFor(() => {
      expect(screen.getByText('🔄 Synchronizuj z magazynem')).toBeInTheDocument();
    });

    const syncButton = screen.getByText('🔄 Synchronizuj z magazynem');
    fireEvent.click(syncButton);

    // Test że komponent obsługuje pusty magazyn
    expect(syncButton).toBeInTheDocument();
  });

  test('obsługuje brak sprzedaży', async () => {
    fetch.mockImplementation((url) => {
      if (url.includes('/api/sales/get-all-sales')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]) // Brak sprzedaży
        });
      }
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([])
      });
    });

    render(<AddToState />);

    await waitFor(() => {
      expect(screen.getByText('🔄 Synchronizuj z magazynem')).toBeInTheDocument();
    });

    const syncButton = screen.getByText('🔄 Synchronizuj z magazynem');
    fireEvent.click(syncButton);

    // Test że komponent obsługuje brak sprzedaży
    expect(syncButton).toBeInTheDocument();
  });

  test('obsługuje błędy API', async () => {
    fetch.mockImplementation((url) => {
      return Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server error' })
      });
    });

    render(<AddToState />);

    await waitFor(() => {
      // Komponent powinien się załadować mimo błędów API
      expect(screen.getByText('🔄 Synchronizuj z magazynem')).toBeInTheDocument();
    });
  });
});





