// AddToState.orange.simple.test.js - Uproszczone testy dla pomarańczowych elementów
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Create a mock for the utility function
const mockGetMagazynSymbol = jest.fn();

// Mock the entire module that contains getMagazynSymbol
jest.mock('./AddToState', () => {
  const actual = jest.requireActual('./AddToState');
  return {
    ...actual,
    getMagazynSymbol: () => mockGetMagazynSymbol()
  };
});

// Import the actual component after mocking
const ActualAddToState = jest.requireActual('./AddToState').default;

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

describe('🟠 AddToState Pomarańczowe Elementy - Uproszczone Testy', () => {
  jest.setTimeout(10000);

  const mockMagazynData = [
    {
      id: 'mag1',
      fullName: 'Test Kurtka Pomarańczowa',
      size: 'M',
      barcode: '1111111111111',
      price: '150',
      symbol: 'MAGAZYN'
    },
    {
      id: 'mag2', 
      fullName: 'Test Bluza Orange',
      size: 'XL',
      barcode: '2222222222222',
      price: '80;60', // Z ceną promocyjną
      symbol: 'MAGAZYN'
    }
  ];

  const mockUsersData = [
    { sellingPoint: 'Punkt A', symbol: 'PA' },
    { sellingPoint: 'Punkt B', symbol: 'PB' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMagazynSymbol.mockResolvedValue('MAGAZYN');
    
    // Mock API responses
    mockedAxios.get.mockImplementation((url) => {
      if (url === '/api/state') {
        return Promise.resolve({ data: mockMagazynData });
      }
      if (url === '/api/sales/get-all-sales') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/api/transfer') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/api/user') {
        return Promise.resolve({ data: { count: 2, users: mockUsersData } });
      }
      if (url === '/api/transaction-history') {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });

    mockedAxios.post.mockResolvedValue({ data: { success: true } });
    mockedAxios.delete.mockResolvedValue({ data: { success: true } });
  });

  test('🟠 Podstawowy test renderowania komponentu', async () => {
    render(<ActualAddToState />);
    
    // Sprawdź czy komponenet się renderuje
    await waitFor(() => {
      expect(screen.getByText('Magazyn')).toBeInTheDocument();
      expect(screen.getByText('Sprzedaż z danego dnia')).toBeInTheDocument();
    });

    console.log('✅ BASIC TEST PASSED: Komponent się poprawnie renderuje');
  });

  test('🟠 Test dodawania pomarańczowego elementu', async () => {
    render(<ActualAddToState />);
    
    // Poczekaj na załadowanie danych
    await waitFor(() => {
      expect(screen.getByText('Test Kurtka Pomarańczowa')).toBeInTheDocument();
    }, { timeout: 5000 });

    // Znajdź pierwszy element w magazynie
    const magazynTable = screen.getByText('Magazyn').closest('div').querySelector('table tbody');
    const firstRow = magazynTable.querySelector('tr');
    expect(firstRow).toBeInTheDocument();
    
    const transferButton = firstRow.querySelector('button');
    expect(transferButton).toBeInTheDocument();
    
    // Kliknij przycisk (powinien być "Przenieś")
    fireEvent.click(transferButton);

    // Sprawdź czy element pojawił się w sekcji sprzedaży
    await waitFor(() => {
      const salesSection = screen.getByText('Sprzedaż z danego dnia').closest('div');
      const salesTable = salesSection.querySelector('table tbody tr');
      expect(salesTable).toBeInTheDocument();
    }, { timeout: 3000 });

    console.log('✅ ORANGE ADD TEST PASSED: Element został dodany do sekcji sprzedaży');
  });

  test('🟠 Test kolorowania pomarańczowych elementów', async () => {
    render(<ActualAddToState />);
    
    await waitFor(() => {
      const magazynItems = screen.getAllByText('Test Kurtka Pomarańczowa');
      expect(magazynItems.length).toBeGreaterThan(0);
    });

    // Dodaj element
    const magazynTable = screen.getByText('Magazyn').closest('div').querySelector('table tbody');
    const firstRow = magazynTable.querySelector('tr');
    const transferButton = firstRow.querySelector('button');
    fireEvent.click(transferButton);

    // Sprawdź czy element w sekcji sprzedaży ma pomarańczowe tło
    await waitFor(() => {
      const salesSection = screen.getByText('Sprzedaż z danego dnia').closest('div');
      const salesRow = salesSection.querySelector('table tbody tr');
      const cellStyle = salesRow.querySelector('td').style;
      
      // Sprawdź czy ma pomarańczowe tło (RGB(255, 152, 0) to pomarańczowy)
      expect(cellStyle.backgroundColor).toContain('255, 152, 0');
    }, { timeout: 3000 });

    console.log('✅ ORANGE COLOR TEST PASSED: Element ma poprawne pomarańczowe kolorowanie');
  });

  test('🟠 Test API wywołań przy zapisie', async () => {
    render(<ActualAddToState />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Bluza Orange')).toBeInTheDocument();
    });

    // Dodaj element z ceną promocyjną
    const magazynTable = screen.getByText('Magazyn').closest('div').querySelector('table tbody');
    const rows = magazynTable.querySelectorAll('tr');
    const secondRow = rows[1]; // Test Bluza Orange
    const transferButton = secondRow.querySelector('button');
    fireEvent.click(transferButton);

    // Znajdź i kliknij przycisk "Zapisz"
    const saveButton = screen.getByText('Zapisz');
    fireEvent.click(saveButton);

    // Sprawdź API calls
    await waitFor(() => {
      // Sprawdź DELETE call
      expect(mockedAxios.delete).toHaveBeenCalledWith(
        '/api/state/mag2',
        expect.objectContaining({
          headers: expect.objectContaining({
            'operation-type': 'transfer-from-magazyn'
          })
        })
      );

      // Sprawdź POST restore call
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/state/restore-silent',
        expect.objectContaining({
          fullName: 'Test Bluza Orange',
          barcode: '2222222222222',
          symbol: 'PA'
        })
      );

      // Sprawdź transaction history call
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/transaction-history',
        expect.objectContaining({
          operationType: 'sprzedaz'
        })
      );
    }, { timeout: 8000 });

    console.log('✅ ORANGE API TEST PASSED: Wszystkie API calls zostały poprawnie wykonane');
  });

  test('🟠 Test rollback pomarańczowego elementu', async () => {
    // Mock transaction history z pomarańczowym elementem
    const mockOrangeTransaction = [{
      _id: 'trans_orange_1',
      transactionId: 'TXN_ORANGE_001',
      itemsCount: 1,
      selectedSellingPoint: 'Punkt A',
      processedItems: [
        { 
          originalId: 'mag1', 
          fullName: 'Test Kurtka Pomarańczowa', 
          size: 'M',
          barcode: '1111111111111',
          price: 150,
          processType: 'transferred', // Pomarańczowe elementy mają processType: 'transferred'
          originalSymbol: 'MAGAZYN' // Powinny wrócić do magazynu
        }
      ],
      timestamp: new Date().toISOString()
    }];

    // Override mock for transaction history
    mockedAxios.get.mockImplementation((url) => {
      if (url === '/api/transaction-history') {
        return Promise.resolve({ data: mockOrangeTransaction });
      }
      if (url === '/api/state') {
        return Promise.resolve({ data: [] }); // Stan bez elementów (zostały przeniesione)
      }
      if (url === '/api/sales/get-all-sales') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/api/transfer') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/api/user') {
        return Promise.resolve({ data: { count: 2, users: mockUsersData } });
      }
      return Promise.resolve({ data: [] });
    });

    render(<ActualAddToState />);
    
    // Sprawdź czy historia jest załadowana
    await waitFor(() => {
      expect(screen.getByText(/Historia \(\d+\)/)).toBeInTheDocument();
    });

    const historyButton = screen.getByText(/Historia \(\d+\)/);
    fireEvent.click(historyButton);

    await waitFor(() => {
      expect(screen.getByText('Anuluj całość')).toBeInTheDocument();
    });

    // Kliknij przycisk anulowania transakcji
    const undoButton = screen.getByText('Anuluj całość');
    fireEvent.click(undoButton);

    // Potwierdź w modalu
    await waitFor(() => {
      const confirmButton = screen.getByText('Anuluj transakcję');
      fireEvent.click(confirmButton);
    });

    // Sprawdź API calls dla rollback
    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/state/restore-silent',
        expect.objectContaining({
          fullName: 'Test Kurtka Pomarańczowa',
          symbol: 'MAGAZYN', // Wraca do magazynu!
          operationType: 'restore-transfer'
        })
      );

      expect(mockedAxios.delete).toHaveBeenCalledWith('/api/transaction-history/TXN_ORANGE_001');
    }, { timeout: 8000 });

    console.log('✅ ORANGE ROLLBACK TEST PASSED: Pomarańczowy element został przywrócony do magazynu');
  });
});
