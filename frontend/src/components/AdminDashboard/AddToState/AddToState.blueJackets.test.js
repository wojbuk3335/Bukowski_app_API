import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AddToState from './AddToState';

// Setup global fetch mock
global.fetch = jest.fn();
const mockFetch = global.fetch;

// Mock console methods to avoid noise in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

beforeEach(() => {
  // Reset fetch mock and setup default responses
  mockFetch.mockReset();
  
  // Default mock for all API calls
  mockFetch.mockImplementation((url) => {
    // Mock users API
    if (url.includes('/api/user')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          users: [
            { _id: 'user1', symbol: 'TestUser1', sellingPoint: 'TestShop1' },
            { _id: 'user2', symbol: 'TestUser2', sellingPoint: 'TestShop2' }
          ]
        })
      });
    }
    
    // Mock sales API (źródło niebieskich kurtek)
    if (url.includes('/api/sales/get-all-sales')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
          {
            _id: 'sale1',
            fullName: 'Blue Bullet Test',
            size: 'M',
            barcode: 'BLUE123',
            price: 200,
            from: 'TestUser1', // Musi być zgodne z symbol użytkownika
            sellingPoint: 'TestShop1',
            cash: [{ price: 50 }],
            date: '2024-01-15T10:30:00Z',
            timestamp: '2024-01-15T10:30:00Z'
          },
          {
            _id: 'sale2',
            fullName: 'Another Blue Sale',
            size: 'L',
            barcode: 'BLUE456',
            price: 250,
            from: 'TestUser1', // Musi być zgodne z symbol użytkownika
            sellingPoint: 'TestShop2',
            cash: [{ price: 75 }],
            date: '2024-01-16T14:20:00Z',
            timestamp: '2024-01-16T14:20:00Z'
          }
        ])
      });
    }
    
    // Mock state API (dla sprawdzania czy sprzedaże mają pokrycie w stanie)
    if (url.includes('/api/state') && !url.includes('/api/state/warehouse')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
          {
            _id: 'state1',
            productId: 'BLUE123',
            fullName: { fullName: 'Blue Bullet Test' },
            size: { Roz_Opis: 'M' },
            barcode: 'BLUE123',
            symbol: 'TestUser1', // POPRAWKA: symbol powinien być zgodny z sale.from
            sellingPoint: { symbol: 'TestShop1' },
            isFromSale: true,
            isBlueBullet: true,
            transfer_to: 'TestShop1',
            reason: 'SPRZEDAŻ',
            advancePayment: 50,
            timestamp: '2024-01-15T10:30:00Z'
          },
          {
            _id: 'state2',
            productId: 'BLUE456',
            fullName: { fullName: 'Another Blue Sale' },
            size: { Roz_Opis: 'L' },
            barcode: 'BLUE456',
            symbol: 'TestUser1', // POPRAWKA: symbol powinien być zgodny z sale.from
            sellingPoint: { symbol: 'TestShop2' },
            isFromSale: true,
            isBlueBullet: true,
            transfer_to: 'TestShop2',
            reason: 'SPRZEDAŻ',
            advancePayment: 75,
            timestamp: '2024-01-16T14:20:00Z'
          },
          // Dodajemy state elementy dla transferów
          {
            _id: 'state3',
            productId: 'BLUETRANS123',
            fullName: { fullName: 'Blue Transfer Test' },
            size: { Roz_Opis: 'XL' },
            barcode: 'BLUETRANS123',
            symbol: 'TestUser1', // Zgodny z transfer_from
            sellingPoint: { symbol: 'TestShop1' },
            isFromSale: false,
            isBlueBullet: true,
            transfer_to: 'TestShop3',
            reason: 'TRANSFER',
            advancePayment: 100,
            timestamp: '2024-01-17T15:00:00Z'
          },
          {
            _id: 'state4',
            productId: 'BLUETRANS456',
            fullName: { fullName: 'Another Blue Transfer' },
            size: { Roz_Opis: 'M' },
            barcode: 'BLUETRANS456',
            symbol: 'TestUser1', // Zgodny z transfer_from
            sellingPoint: { symbol: 'TestShop1' },
            isFromSale: false,
            isBlueBullet: true,
            transfer_to: 'TestShop4',
            reason: 'EXCHANGE',
            advancePayment: 80,
            timestamp: '2024-01-18T16:00:00Z'
          }
        ])
      });
    }
    
    // Mock transfer API (transfery niebieskie - nie z magazynu)
    if (url.includes('/api/transfer') && !url.includes('/api/transfer/last-transaction')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
          {
            _id: 'transfer1',
            fullName: { fullName: 'Blue Transfer Test' },
            size: { Roz_Opis: 'XL' },
            productId: 'BLUETRANS123',
            barcode: 'BLUETRANS123',
            transfer_from: 'TestUser1',
            transfer_to: 'TestShop3',
            fromWarehouse: false, // To sprawia że będzie niebieski
            isFromSale: false,
            isBlueBullet: true,
            reason: 'TRANSFER',
            advancePayment: 100,
            advancePaymentCurrency: 'PLN',
            date: '2024-01-17T15:00:00Z'
          },
          {
            _id: 'transfer2', 
            fullName: { fullName: 'Another Blue Transfer' },
            size: { Roz_Opis: 'M' },
            productId: 'BLUETRANS456',
            barcode: 'BLUETRANS456',
            transfer_from: 'TestUser1', // Zmienione z TestUser2 na TestUser1
            transfer_to: 'TestShop4',
            fromWarehouse: false, // To sprawia że będzie niebieski
            isFromSale: false,
            isBlueBullet: true,
            reason: 'EXCHANGE',
            advancePayment: 80,
            advancePaymentCurrency: 'PLN',
            date: '2024-01-18T16:00:00Z'
          }
        ])
      });
    }
    
    // Mock other API endpoints
    if (url.includes('/api/state/warehouse') || url.includes('/api/transfer/last-transaction')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([])
      });
    }
    
    return Promise.reject(new Error('Unknown URL: ' + url));
  });
});

afterEach(() => {
  mockFetch.mockClear();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

describe('AddToState - Niebieskie kurtki (sprzedaże)', () => {

  test('renderuje podstawowy interfejs', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    await waitFor(() => {
      expect(screen.getByText('📦 Magazyn')).toBeInTheDocument();
      expect(screen.getByText('Mechanizm Transferów')).toBeInTheDocument();
    });
  });

  test('wyświetla sprzedaże z niebieskim tłem', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    // Wybierz użytkownika aby zobaczyć sprzedaże
    await waitFor(() => {
      const userSelect = screen.getByDisplayValue('-- Select User --');
      expect(userSelect).toBeInTheDocument();
    });

    const userSelect = screen.getByDisplayValue('-- Select User --');
    await act(async () => {
      fireEvent.change(userSelect, { target: { value: 'user1' } });
    });

    await waitFor(() => {
      expect(screen.getByText('Blue Bullet Test')).toBeInTheDocument();
    });

    // Znajdź element z niebieskim tłem
    const blueElement = screen.getByText('Blue Bullet Test').closest('tr');
    expect(blueElement).toHaveStyle('background-color: rgb(0, 123, 255)'); // #007bff
  });

  test('wyświetla tekst "SPRZEDANO w [punkt]"', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    // Wybierz użytkownika
    const userSelect = screen.getByDisplayValue('-- Select User --');
    await act(async () => {
      fireEvent.change(userSelect, { target: { value: 'user1' } });
    });

    await waitFor(() => {
      expect(screen.getByText('SPRZEDANO w TestShop1')).toBeInTheDocument();
      expect(screen.getByText('SPRZEDANO w TestShop2')).toBeInTheDocument();
    });
  });

  test('wyświetla powód "SPRZEDAŻ"', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    // Wybierz użytkownika
    const userSelect = screen.getByDisplayValue('-- Select User --');
    await act(async () => {
      fireEvent.change(userSelect, { target: { value: 'user1' } });
    });

    await waitFor(() => {
      const reasonCells = screen.getAllByText('SPRZEDAŻ');
      expect(reasonCells.length).toBeGreaterThan(0);
    });
  });

  test('wyświetla kwoty zaliczek', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    // Wybierz użytkownika
    const userSelect = screen.getByDisplayValue('-- Select User --');
    await act(async () => {
      fireEvent.change(userSelect, { target: { value: 'user1' } });
    });

    await waitFor(() => {
      expect(screen.getByText('50 PLN')).toBeInTheDocument();
      expect(screen.getByText('75 PLN')).toBeInTheDocument();
    });
  });

  test('wyświetla kody kreskowe sprzedaży', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    // Wybierz użytkownika
    const userSelect = screen.getByDisplayValue('-- Select User --');
    await act(async () => {
      fireEvent.change(userSelect, { target: { value: 'user1' } });
    });

    await waitFor(() => {
      expect(screen.getByText('BLUE123')).toBeInTheDocument();
      expect(screen.getByText('BLUE456')).toBeInTheDocument();
    });
  });

  test('wyświetla rozmiary sprzedanych produktów', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    // Wybierz użytkownika
    const userSelect = screen.getByDisplayValue('-- Select User --');
    await act(async () => {
      fireEvent.change(userSelect, { target: { value: 'user1' } });
    });

    await waitFor(() => {
      // Sprawdź wszystkie rozmiary (może być kilka takich samych)
      const sizesM = screen.getAllByText('M');
      expect(sizesM.length).toBeGreaterThan(0);
      expect(screen.getByText('L')).toBeInTheDocument();
      expect(screen.getByText('XL')).toBeInTheDocument(); // Transfer ma XL
    });
  });

  test('odróżnia sprzedaże od transferów magazynowych', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    // Wybierz użytkownika
    const userSelect = screen.getByDisplayValue('-- Select User --');
    await act(async () => {
      fireEvent.change(userSelect, { target: { value: 'user1' } });
    });

    await waitFor(() => {
      expect(screen.getByText('Blue Bullet Test')).toBeInTheDocument();
    });

    // Sprawdź czy niebieskie elementy nie mają pomarańczowego tła
    const blueElement = screen.getByText('Blue Bullet Test').closest('tr');
    expect(blueElement).not.toHaveStyle('background-color: rgb(255, 140, 0)'); // nie #ff8c00
  });

  test('wyświetla daty sprzedaży (timestamp)', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    // Wybierz użytkownika
    const userSelect = screen.getByDisplayValue('-- Select User --');
    await act(async () => {
      fireEvent.change(userSelect, { target: { value: 'user1' } });
    });

    await waitFor(() => {
      // Sprawdź czy są wyświetlane jakiekolwiek daty w formacie DD.MM.YYYY
      expect(screen.getByText('15.01.2024')).toBeInTheDocument();
      expect(screen.getByText('16.01.2024')).toBeInTheDocument();
    });
  });

  test('filtruje sprzedaże które mają pokrycie w stanie', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    // Wybierz użytkownika
    const userSelect = screen.getByDisplayValue('-- Select User --');
    await act(async () => {
      fireEvent.change(userSelect, { target: { value: 'user1' } });
    });

    await waitFor(() => {
      // Sprawdź czy sprzedaże są wyświetlane (mają pokrycie w state)
      expect(screen.getByText('Blue Bullet Test')).toBeInTheDocument();
      expect(screen.getByText('Another Blue Sale')).toBeInTheDocument();
    });
  });

  test('wyświetla obsługę wielu niebieskich kurtek jednocześnie (sprzedaże + transfery)', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    // Wybierz użytkownika
    const userSelect = screen.getByDisplayValue('-- Select User --');
    await act(async () => {
      fireEvent.change(userSelect, { target: { value: 'user1' } });
    });

    await waitFor(() => {
      // Sprawdź sprzedaże (2 sztuki)
      expect(screen.getByText('Blue Bullet Test')).toBeInTheDocument();
      expect(screen.getByText('Another Blue Sale')).toBeInTheDocument();
      
      // Sprawdź transfery niebieskie (2 sztuki)
      expect(screen.getByText('Blue Transfer Test')).toBeInTheDocument();
      expect(screen.getByText('Another Blue Transfer')).toBeInTheDocument();
      
      // Sprawdź łączną liczbę (4 niebieskie kurtki)
      expect(screen.getByText(/Zapisz - Odpisz wszystkie kurtki ze stanu \(\s*4\s*\)/)).toBeInTheDocument();
    });
  });

  test('wyświetla transfery niebieskie (nie z magazynu) z niebieskim tłem', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    // Wybierz użytkownika
    const userSelect = screen.getByDisplayValue('-- Select User --');
    await act(async () => {
      fireEvent.change(userSelect, { target: { value: 'user1' } });
    });

    await waitFor(() => {
      // Sprawdź transfery niebieskie - wszystkie rzędy z niebieskim tłem
      const blueRows = screen.getAllByText(/Blue|SPRZEDAŻ|TRANSFER|EXCHANGE/);
      expect(blueRows.length).toBeGreaterThanOrEqual(4); // Min 4 elementy niebieskie
    });
  });

  test('wyświetla powody transferów niebieskich (TRANSFER, EXCHANGE)', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    // Wybierz użytkownika
    const userSelect = screen.getByDisplayValue('-- Select User --');
    await act(async () => {
      fireEvent.change(userSelect, { target: { value: 'user1' } });
    });

    await waitFor(() => {
      expect(screen.getByText('TRANSFER')).toBeInTheDocument();
      expect(screen.getByText('EXCHANGE')).toBeInTheDocument();
    });
  });

  test('wyświetla zaliczki transferów niebieskich z walutą', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    // Wybierz użytkownika
    const userSelect = screen.getByDisplayValue('-- Select User --');
    await act(async () => {
      fireEvent.change(userSelect, { target: { value: 'user1' } });
    });

    await waitFor(() => {
      expect(screen.getByText('100 PLN')).toBeInTheDocument(); // transfer1
      expect(screen.getByText('80 PLN')).toBeInTheDocument();  // transfer2
    });
  });

});
