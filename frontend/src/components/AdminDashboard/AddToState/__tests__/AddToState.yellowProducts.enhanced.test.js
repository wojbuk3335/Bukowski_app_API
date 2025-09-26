import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import AddToState from '../AddToState';

// Mock fetch globalnie
global.fetch = jest.fn();

// Mock console methods to avoid cluttering test output
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

describe('AddToState - Yellow Products (Incoming Transfers) Enhanced Tests', () => {
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

  const mockUsers = [
    { _id: 'user1', symbol: 'TestUser', name: 'Test User' },
    { _id: 'user2', symbol: 'Admin', name: 'Administrator' }
  ];

  const mockApiResponses = {
    transfers: () => Promise.resolve({
      ok: true,
      json: async () => [mockYellowTransfer]
    }),
    users: () => Promise.resolve({
      ok: true,
      json: async () => ({ users: mockUsers })
    }),
    state: () => Promise.resolve({
      ok: true,
      json: async () => []
    }),
    sales: () => Promise.resolve({
      ok: true,
      json: async () => []
    }),
    warehouse: () => Promise.resolve({
      ok: true,
      json: async () => []
    }),
    lastTransaction: () => Promise.resolve({
      status: 404,
      json: async () => ({ message: 'No transaction found' })
    })
  };

  const setupMockResponses = () => {
    // Setup persistent mocks that handle multiple calls
    fetch.mockImplementation((url) => {
      if (url.includes('/api/transfer')) {
        return mockApiResponses.transfers();
      }
      if (url.includes('/api/sales')) {
        return mockApiResponses.sales();
      }
      if (url.includes('/api/state/warehouse')) {
        return mockApiResponses.warehouse();
      }
      if (url.includes('/api/state')) {
        return mockApiResponses.state();
      }
      if (url.includes('/api/user')) {
        return mockApiResponses.users();
      }
      if (url.includes('/api/lastTransaction') || url.includes('/api/transfer/last-transaction')) {
        return mockApiResponses.lastTransaction();
      }
      // Default response
      return Promise.resolve({
        ok: true,
        json: async () => []
      });
    });
  };

  beforeEach(() => {
    fetch.mockClear();
    jest.clearAllMocks();
    window.alert = jest.fn();
    window.confirm = jest.fn(() => true);
    
    setupMockResponses();
  });

  test('0. Powinien załadować komponent bez błędów', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    expect(screen.getByText('Magazyn')).toBeInTheDocument();
    expect(screen.getByText('Dobieranie towaru')).toBeInTheDocument();
  });

  test('1. Wyświetlanie żółtych produktów w odpowiednim kolorze', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    // Czekaj na załadowanie danych z API (sprawdź czy fetch został wywołany)
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/user'));
    });

    // Sprawdź czy użytkownicy zostali załadowani (może potrzeba więcej czasu)
    await waitFor(() => {
      const userSelect = screen.getByDisplayValue("-- Wybierz użytkownika --");
      // Sprawdź czy opcje użytkowników są dostępne
      const options = userSelect.querySelectorAll('option');
      expect(options.length).toBeGreaterThan(1);
    }, { timeout: 3000 });

    // Wybierz użytkownika TestUser
    const userSelect = screen.getByDisplayValue("-- Wybierz użytkownika --");
    await act(async () => {
      fireEvent.change(userSelect, { target: { value: 'user1' } });
    });

    // Czekaj na załadowanie i wyświetlenie transferów
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/transfer'));
      const productElement = screen.getByText('Yellow Test Product');
      expect(productElement).toBeInTheDocument();
      
      // Sprawdź czy element ma żółte tło
      const productRow = productElement.closest('tr');
      expect(productRow).toHaveStyle({ backgroundColor: 'rgb(255, 193, 7)' });
    }, { timeout: 3000 });
  });

  test('2. Filtrowanie żółtych produktów według daty', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/transfer'));
    });

    // Ustaw filtr daty na dzisiaj
    const dateInput = screen.getByLabelText("Wybierz datę:");
    await act(async () => {
      fireEvent.change(dateInput, { target: { value: '2025-08-31' } });
    });

    // Wybierz użytkownika
    const userSelect = screen.getByDisplayValue("-- Wybierz użytkownika --");
    await act(async () => {
      fireEvent.change(userSelect, { target: { value: 'user1' } });
    });

    await waitFor(() => {
      expect(screen.getByText('Yellow Test Product')).toBeInTheDocument();
    });
  });

  test('3. Przetwarzanie żółtych produktów - dodanie do stanu', async () => {
    // Mock responses for state processing
    fetch.mockImplementation((url, options) => {
      const method = options?.method || 'GET';
      
      if (url.includes('/api/transfer') && method === 'GET') {
        return Promise.resolve({
          ok: true,
          json: async () => [mockYellowTransfer]
        });
      }
      if (url.includes('/api/transfer/process-warehouse') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            message: 'Items processed successfully',
            transactionId: 'test_transaction_123',
            processedCount: 1,
            addedItems: [{
              id: 'state_123',
              fullName: 'Yellow Test Product',
              barcode: 'INCOMING_123456',
              action: 'added_to_state'
            }]
          })
        });
      }
      if (url.includes('/api/sales')) {
        return mockApiResponses.sales();
      }
      if (url.includes('/api/state/warehouse')) {
        return mockApiResponses.warehouseItems();
      }
      if (url.includes('/api/state')) {
        return mockApiResponses.state();
      }
      if (url.includes('/api/user')) {
        return mockApiResponses.users();
      }
      if (url.includes('/api/lastTransaction') || url.includes('/api/transfer/last-transaction')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            transactionId: 'test_transaction_123',
            timestamp: new Date().toISOString(),
            itemCount: 1,
            canUndo: true,
            transactionType: 'incoming'
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({})
      });
    });

    await act(async () => {
      render(<AddToState />);
    });

    // Poczekaj na załadowanie użytkowników
    await waitFor(() => {
      const userSelect = screen.getByDisplayValue("-- Wybierz użytkownika --");
      expect(userSelect.children.length).toBeGreaterThan(1);
    });

    // Wybierz użytkownika
    const userSelect = screen.getByDisplayValue("-- Wybierz użytkownika --");
    await act(async () => {
      fireEvent.change(userSelect, { target: { value: 'user1' } });
    });

    // Poczekaj na załadowanie produktów
    await waitFor(() => {
      expect(screen.getByText('Yellow Test Product')).toBeInTheDocument();
    });

    // Kliknij przycisk przetwarzania
    const processButton = screen.getByText(/zapisz.*odpisz wszystkie kurtki ze stanu/i);
    await act(async () => {
      fireEvent.click(processButton);
    });

    // Poczekaj na pojawienie się modalu potwierdzenia drukowania
    await waitFor(() => {
      expect(screen.getByText('Potwierdzenie drukowania etykiet')).toBeInTheDocument();
    });

    // Kliknij "Tak - Kontynuuj" w modalu
    const confirmButton = screen.getByText(/tak.*kontynuuj/i);
    await act(async () => {
      fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/transfer/process-warehouse'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('isIncomingTransfer')
        })
      );
    });
  });

  test('4. Synchronizacja z kombinowanymi elementami', async () => {
    const mockWarehouseItem = {
      _id: 'warehouse-1',
      fullName: { fullName: 'Warehouse Product' },
      size: { Roz_Opis: 'M' },
      barcode: '789012',
      price: 100
    };

    // Mock responses with both yellow transfer and warehouse item
    fetch.mockImplementation((url) => {
      if (url.includes('/api/transfer')) {
        return Promise.resolve({
          ok: true,
          json: async () => [mockYellowTransfer]
        });
      }
      if (url.includes('/api/sales')) {
        return mockApiResponses.sales();
      }
      if (url.includes('/api/state/warehouse')) {
        return Promise.resolve({
          ok: true,
          json: async () => [mockWarehouseItem]
        });
      }
      if (url.includes('/api/state')) {
        return mockApiResponses.state();
      }
      if (url.includes('/api/user')) {
        return mockApiResponses.users();
      }
      if (url.includes('/api/lastTransaction') || url.includes('/api/transfer/last-transaction')) {
        return mockApiResponses.lastTransaction();
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({})
      });
    });

    await act(async () => {
      render(<AddToState />);
    });

    // Poczekaj na załadowanie użytkowników
    await waitFor(() => {
      const userSelect = screen.getByDisplayValue("-- Wybierz użytkownika --");
      expect(userSelect.children.length).toBeGreaterThan(1);
    });

    // Wybierz użytkownika
    const userSelect = screen.getByDisplayValue("-- Wybierz użytkownika --");
    await act(async () => {
      fireEvent.change(userSelect, { target: { value: 'user1' } });
    });

    // Poczekaj na załadowanie produktów
    await waitFor(() => {
      expect(screen.getByText('Yellow Test Product')).toBeInTheDocument();
    });

    // Kliknij synchronizację
    const syncButton = screen.getByText(/Zapisz - Odpisz wszystkie kurtki ze stanu/);
    await act(async () => {
      fireEvent.click(syncButton);
    });

    await waitFor(() => {
      // Sprawdź czy oba produkty są widoczne
      expect(screen.getByText('Yellow Test Product')).toBeInTheDocument();
      expect(screen.getByText('Warehouse Product')).toBeInTheDocument();
    });
  });

  test('5. Funkcja getBackgroundColor dla incoming transfers', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/transfer'));
    });

    // Wybierz użytkownika
    const userSelect = screen.getByDisplayValue("-- Wybierz użytkownika --");
    await act(async () => {
      fireEvent.change(userSelect, { target: { value: 'user1' } });
    });

    await waitFor(() => {
      const yellowProduct = screen.getByText('Yellow Test Product');
      const productRow = yellowProduct.closest('tr');
      
      // Sprawdź czy background-color to żółty (#ffc107)
      expect(productRow).toHaveStyle({
        backgroundColor: 'rgb(255, 193, 7)'
      });
    });
  });

  test('6. Aktualizacja transakcji żółtych transferów', async () => {
    const initialTransactionData = {
      _id: 'transaction-1',
      products: [
        {
          productId: 'yellow-1',
          fullName: { fullName: 'Yellow Test Product' },
          price: 50,
          quantity: 2
        }
      ],
      user: { _id: 'user1', fullName: 'Test User' }
    };

    // Mock responses with transaction processing
    fetch.mockImplementation((url, options) => {
      const method = options?.method || 'GET';
      
      if (url.includes('/api/transfer') && method === 'GET') {
        return Promise.resolve({
          ok: true,
          json: async () => [mockYellowTransfer]
        });
      }
      if (url.includes('/api/transfer/process-warehouse') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            message: 'Transaction updated successfully',
            transactionId: 'test_transaction_123',
            processedCount: 1
          })
        });
      }
      if (url.includes('/api/sales')) {
        return mockApiResponses.sales();
      }
      if (url.includes('/api/state/warehouse')) {
        return mockApiResponses.warehouseItems();
      }
      if (url.includes('/api/state')) {
        return mockApiResponses.state();
      }
      if (url.includes('/api/user')) {
        return mockApiResponses.users();
      }
      if (url.includes('/api/lastTransaction') || url.includes('/api/transfer/last-transaction')) {
        return Promise.resolve({
          ok: true,
          json: async () => initialTransactionData
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({})
      });
    });

    await act(async () => {
      render(<AddToState />);
    });

    // Poczekaj na załadowanie użytkowników
    await waitFor(() => {
      const userSelect = screen.getByDisplayValue("-- Wybierz użytkownika --");
      expect(userSelect.children.length).toBeGreaterThan(1);
    });

    // Wybierz użytkownika
    const userSelect = screen.getByDisplayValue("-- Wybierz użytkownika --");
    await act(async () => {
      fireEvent.change(userSelect, { target: { value: 'user1' } });
    });

    // Poczekaj na załadowanie produktów
    await waitFor(() => {
      expect(screen.getByText('Yellow Test Product')).toBeInTheDocument();
    });

    // Kliknij przycisk zapisz (żółte produkty używają process-warehouse, nie sales)
    const saveButton = screen.getByText(/zapisz.*odpisz wszystkie kurtki ze stanu/i);
    await act(async () => {
      fireEvent.click(saveButton);
    });

    // Poczekaj na pojawienie się modalu potwierdzenia drukowania
    await waitFor(() => {
      expect(screen.getByText('Potwierdzenie drukowania etykiet')).toBeInTheDocument();
    });

    // Kliknij "Tak - Kontynuuj" w modalu
    const confirmButton = screen.getByText(/tak.*kontynuuj/i);
    await act(async () => {
      fireEvent.click(confirmButton);
    });

    // Sprawdź wywołanie API dla process-warehouse (nie sales)
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/transfer/process-warehouse'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  test('7. Resetowanie synchronizacji po przetworzeniu', async () => {
    fetch
      .mockResolvedValueOnce(mockApiResponses.transfers())
      .mockResolvedValueOnce(mockApiResponses.sales())
      .mockResolvedValueOnce(mockApiResponses.warehouse())
      .mockResolvedValueOnce(mockApiResponses.state())
      .mockResolvedValueOnce(mockApiResponses.users())
      .mockResolvedValueOnce(mockApiResponses.lastTransaction())
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'Warehouse items processed successfully',
          transactionId: 'test_transaction_789'
        })
      })
      .mockResolvedValueOnce(mockApiResponses.transfers())
      .mockResolvedValueOnce(mockApiResponses.sales())
      .mockResolvedValueOnce(mockApiResponses.warehouse())
      .mockResolvedValueOnce(mockApiResponses.state())
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          transactionId: 'test_transaction_789',
          timestamp: new Date().toISOString(),
          itemCount: 1,
          canUndo: true,
          transactionType: 'incoming'
        })
      });

    await act(async () => {
      render(<AddToState />);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/transfer'));
    });

    // Wybierz użytkownika
    const userSelect = screen.getByDisplayValue("-- Wybierz użytkownika --");
    await act(async () => {
      fireEvent.change(userSelect, { target: { value: 'user1' } });
    });

    // Synchronizuj
    const syncButton = screen.getByText(/Zapisz - Odpisz wszystkie kurtki ze stanu/);
    await act(async () => {
      fireEvent.click(syncButton);
    });

    // Przetwórz
    const processButton = screen.getByText(/zapisz.*odpisz wszystkie kurtki ze stanu/i);
    await act(async () => {
      fireEvent.click(processButton);
    });

    await waitFor(() => {
      // Sprawdź czy stan synchronizacji został zresetowany
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/transfer/last-transaction'));
    });
  });

  test('8. Obsługa błędów w żółtych transferach', async () => {
    // Mock window.alert do przechwytywania błędów
    const originalAlert = window.alert;
    window.alert = jest.fn();

    // Mock responses with error simulation
    fetch.mockImplementation((url, options) => {
      const method = options?.method || 'GET';
      
      if (url.includes('/api/transfer')) {
        // Symulacja błędu sieciowego - odrzucenie promise
        return Promise.reject(new Error('Failed to fetch transfers: Database connection failed'));
      }
      if (url.includes('/api/sales')) {
        return mockApiResponses.sales();
      }
      if (url.includes('/api/state/warehouse')) {
        return mockApiResponses.warehouseItems();
      }
      if (url.includes('/api/state')) {
        return mockApiResponses.state();
      }
      if (url.includes('/api/user')) {
        return mockApiResponses.users();
      }
      if (url.includes('/api/lastTransaction') || url.includes('/api/transfer/last-transaction')) {
        return mockApiResponses.lastTransaction();
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({})
      });
    });

    await act(async () => {
      render(<AddToState />);
    });

    // Poczekaj na załadowanie użytkowników
    await waitFor(() => {
      const userSelect = screen.getByDisplayValue("-- Wybierz użytkownika --");
      expect(userSelect.children.length).toBeGreaterThan(1);
    });

    // Wybierz użytkownika (to powinno wyzwolić fetchowanie transferów)
    const userSelect = screen.getByDisplayValue("-- Wybierz użytkownika --");
    await act(async () => {
      fireEvent.change(userSelect, { target: { value: 'user1' } });
    });

    // Poczekaj krótko na przetworzenie błędu
    await new Promise(resolve => setTimeout(resolve, 100));

    // Sprawdź że nie ma produktów żółtych (przez błąd)
    expect(screen.queryByText('Yellow Test Product')).not.toBeInTheDocument();

    // Przywróć oryginalny alert
    window.alert = originalAlert;
  });

  test('9. Sprawdzenie filterItemsByDate dla żółtych produktów', async () => {
    setupMockResponses();

    await act(async () => {
      render(<AddToState />);
    });

    // Poczekaj na załadowanie użytkowników
    await waitFor(() => {
      const userSelect = screen.getByDisplayValue("-- Wybierz użytkownika --");
      expect(userSelect.children.length).toBeGreaterThan(1);
    });

    // Ustaw filtr daty na dzisiaj
    const dateInput = screen.getByLabelText("Wybierz datę:");
    await act(async () => {
      fireEvent.change(dateInput, { target: { value: '2025-08-31' } });
    });

    // Wybierz użytkownika
    const userSelect = screen.getByDisplayValue("-- Wybierz użytkownika --");
    await act(async () => {
      fireEvent.change(userSelect, { target: { value: 'user1' } });
    });

    await waitFor(() => {
      // Sprawdź czy tylko dzisiejszy transfer jest widoczny
      expect(screen.getByText('Yellow Test Product')).toBeInTheDocument();
    });
  });

  test('10. Test kompleksowy - pełny workflow żółtych produktów', async () => {
    // Specjalny mock z pełnym workflow
    fetch.mockImplementation((url) => {
      if (url.includes('/api/transfer/process-warehouse')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            message: 'Warehouse items processed successfully',
            transactionId: 'workflow_test_123',
            processedCount: 1,
            addedItems: [{
              id: 'state_workflow_123',
              fullName: 'Yellow Test Product',
              barcode: 'INCOMING_123456',
              action: 'added_to_state'
            }]
          })
        });
      }
      if (url.includes('/api/transfer/undo-last')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            message: 'Transaction successfully undone (history cleaned)',
            transactionId: 'workflow_test_123',
            restoredCount: 1,
            restoredItems: [{
              id: 'state_workflow_123',
              fullName: 'Yellow Test Product',
              action: 'restored_to_transfer_list'
            }]
          })
        });
      }
      if (url.includes('/api/transfer/last-transaction')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            transactionId: 'workflow_test_123',
            timestamp: new Date().toISOString(),
            itemCount: 1,
            canUndo: true,
            transactionType: 'incoming'
          })
        });
      }
      if (url.includes('/api/transfer')) {
        return mockApiResponses.transfers();
      }
      if (url.includes('/api/sales')) {
        return mockApiResponses.sales();
      }
      if (url.includes('/api/state/warehouse')) {
        return mockApiResponses.warehouse();
      }
      if (url.includes('/api/state')) {
        return mockApiResponses.state();
      }
      if (url.includes('/api/user')) {
        return mockApiResponses.users();
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({})
      });
    });

    await act(async () => {
      render(<AddToState />);
    });

    // Poczekaj na załadowanie użytkowników
    await waitFor(() => {
      const userSelect = screen.getByDisplayValue("-- Wybierz użytkownika --");
      expect(userSelect.children.length).toBeGreaterThan(1);
    });

    // 1. Wybierz użytkownika
    const userSelect = screen.getByDisplayValue("-- Wybierz użytkownika --");
    await act(async () => {
      fireEvent.change(userSelect, { target: { value: 'user1' } });
    });

    // 2. Sprawdź żółty kolor - poczekaj na załadowanie produktów
    await waitFor(() => {
      const yellowProduct = screen.getByText('Yellow Test Product');
      const productRow = yellowProduct.closest('tr');
      expect(productRow).toHaveStyle({ backgroundColor: 'rgb(255, 193, 7)' });
    });

    // 3. Przetwórz produkt
    const processButton = screen.getByText(/zapisz.*odpisz wszystkie kurtki ze stanu/i);
    await act(async () => {
      fireEvent.click(processButton);
    });

    // Poczekaj na pojawienie się modalu potwierdzenia drukowania
    await waitFor(() => {
      expect(screen.getByText('Potwierdzenie drukowania etykiet')).toBeInTheDocument();
    });

    // Kliknij "Tak - Kontynuuj" w modalu
    const confirmButton = screen.getByText(/tak.*kontynuuj/i);
    await act(async () => {
      fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/transfer/process-warehouse'),
        expect.objectContaining({
          method: 'POST'
        })
      );
    });

    // 4. Sprawdź przycisk undo
    await waitFor(() => {
      expect(screen.getByText(/anuluj ostatnią transakcję/i)).toBeInTheDocument();
    });

    // 5. Cofnij transakcję
    const undoButton = screen.getByText(/anuluj ostatnią transakcję/i);
    
    // Mock window.confirm
    window.confirm = jest.fn(() => true);
    
    await act(async () => {
      fireEvent.click(undoButton);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/transfer/undo-last'),
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });
});
