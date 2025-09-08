import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import AddToState from './AddToState';

// Mock fetch
global.fetch = jest.fn();

// Mock window methods
window.alert = jest.fn();
window.confirm = jest.fn(() => true);

describe('AddToState - Proste testy odświeżania selecta', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock podstawowych odpowiedzi API
    fetch.mockImplementation((url, options) => {
      console.log('Fetch called with:', url, options?.method);
      
      // Mock users API
      if (url.includes('/api/user')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            users: [
              { _id: 'user1', symbol: 'Symbol1', sellingPoint: 'Punkt 1', email: 'test1@test.com' },
              { _id: 'user2', symbol: 'Symbol2', sellingPoint: 'Punkt 2', email: 'test2@test.com' }
            ]
          })
        });
      }
      
      // Mock warehouse items API
      if (url.includes('/api/state/warehouse')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            {
              _id: 'warehouse1',
              fullName: { fullName: 'Kurtka Test A' },
              size: { Roz_Opis: 'M' },
              barcode: 'TEST123',
              price: 100,
              sellingPoint: { symbol: 'MAGAZYN' }
            }
          ])
        });
      }
      
      // Mock transfers API
      if (url.includes('/api/transfer')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      }
      
      // Mock sales API  
      if (url.includes('/api/sales')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      }
      
      // Mock state API
      if (url.includes('/api/state')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      }
      
      // Default response
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([])
      });
    });
  });

  test('1. Komponent renderuje się poprawnie z selectem użytkowników', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    // Sprawdź czy select jest widoczny
    await waitFor(() => {
      expect(screen.getByLabelText('Select User:')).toBeInTheDocument();
      expect(screen.getByDisplayValue('-- Select User --')).toBeInTheDocument();
    });
  });

  test('2. Wybór użytkownika powoduje odświeżenie danych', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    // Wybierz użytkownika
    await waitFor(() => {
      const userSelect = screen.getByDisplayValue('-- Select User --');
      fireEvent.change(userSelect, { target: { value: 'user1' } });
    });

    // Sprawdź czy wywołano API po wyborze użytkownika
    await waitFor(() => {
      // Sprawdź czy fetch został wywołany z różnymi endpointami
      const fetchCalls = fetch.mock.calls;
      const transferCall = fetchCalls.some(call => call[0].includes('/api/transfer'));
      const warehouseCall = fetchCalls.some(call => call[0].includes('/api/state/warehouse'));
      
      expect(transferCall).toBe(true);
      expect(warehouseCall).toBe(true);
      // Oczekujemy więcej wywołań (inicjalne + odświeżenie po wyborze)
      expect(fetch.mock.calls.length).toBeGreaterThan(10);
    });
  });

  test('3. Kliknięcie w select z już wybranym użytkownikiem odświeża dane', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    // Wybierz użytkownika
    await waitFor(() => {
      const userSelect = screen.getByDisplayValue('-- Select User --');
      fireEvent.change(userSelect, { target: { value: 'user1' } });
    });

    // Wyczyść poprzednie wywołania fetch
    jest.clearAllMocks();

    // Kliknij w select z już wybranym użytkownikiem
    await waitFor(() => {
      const userSelect = screen.getByDisplayValue('Symbol1 - Punkt 1');
      fireEvent.click(userSelect);
    });

    // Sprawdź czy dane zostały odświeżone
    await waitFor(() => {
      // Sprawdź czy fetch został wywołany z endpointami odświeżania danych
      const fetchCalls = fetch.mock.calls;
      const transferCall = fetchCalls.some(call => call[0].includes('/api/transfer'));
      const warehouseCall = fetchCalls.some(call => call[0].includes('/api/state/warehouse'));
      
      expect(transferCall).toBe(true);
      expect(warehouseCall).toBe(true);
      // Powinno być co najmniej kilka wywołań
      expect(fetch.mock.calls.length).toBeGreaterThan(3);
    });
  });

  test('4. Kliknięcie w select bez wybranego użytkownika nie powoduje odświeżenia', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    // Poczekaj na załadowanie komponentu
    await waitFor(() => {
      expect(screen.getByDisplayValue('-- Select User --')).toBeInTheDocument();
    });

    // Wyczyść poprzednie wywołania fetch z renderowania
    jest.clearAllMocks();

    // Kliknij w select bez wybranego użytkownika
    const userSelect = screen.getByDisplayValue('-- Select User --');
    fireEvent.click(userSelect);

    // Sprawdź czy fetch NIE został wywołany (bo nie ma wybranego użytkownika)
    expect(fetch).not.toHaveBeenCalled();
  });

});
