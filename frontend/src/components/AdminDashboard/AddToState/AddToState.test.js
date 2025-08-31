import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import AddToState from './AddToState';

// Mock fetch
global.fetch = jest.fn();

// Mock window.alert
window.alert = jest.fn();
window.confirm = jest.fn();

describe('AddToState - Pomarańczowe kurtki (transfery z magazynu)', () => {
  
  beforeEach(() => {
    // Reset mocks przed każdym testem
    jest.clearAllMocks();
    
    // Mock podstawowych odpowiedzi API
    fetch.mockImplementation((url) => {
      // Mock users API
      if (url.includes('/api/user')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            users: [
              { _id: 'user1', symbol: 'Symbol1', sellingPoint: 'Punkt1', email: 'test@test.com' },
              { _id: 'user2', symbol: 'Symbol2', sellingPoint: 'Punkt2', email: 'test2@test.com' },
              { _id: 'admin', symbol: 'admin', email: 'admin@test.com' },
              { _id: 'magazyn', symbol: 'magazyn', email: 'warehouse@test.com' }
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
              fullName: { fullName: 'Kurtka Testowa' },
              size: { Roz_Opis: 'M' },
              barcode: 'TEST123',
              price: 100
            },
            {
              _id: 'warehouse2', 
              fullName: { fullName: 'Inna Kurtka' },
              size: { Roz_Opis: 'L' },
              barcode: 'TEST456',
              price: 150
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
      if (url.includes('/api/sales/get-all-sales')) {
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
      
      // Mock last transaction API
      if (url.includes('/api/transfer/last-transaction')) {
        return Promise.resolve({
          ok: false,
          status: 404
        });
      }
      
      return Promise.reject(new Error('Nieznany URL'));
    });
  });

  test('renderuje sekcję magazynu z produktami', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    // Sprawdź czy sekcja magazynu się renderuje
    await waitFor(() => {
      expect(screen.getByText('📦 Magazyn')).toBeInTheDocument();
    });

    // Sprawdź czy produkty z magazynu się renderują
    await waitFor(() => {
      expect(screen.getByText('Kurtka Testowa')).toBeInTheDocument();
      expect(screen.getByText('Inna Kurtka')).toBeInTheDocument();
    });
  });

  test('filtruje produkty magazynowe według wyszukiwanej frazy', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    await waitFor(() => {
      expect(screen.getByText('Kurtka Testowa')).toBeInTheDocument();
      expect(screen.getByText('Inna Kurtka')).toBeInTheDocument();
    });

    // Znajdź pole wyszukiwania
    const searchInput = screen.getByPlaceholderText('Wpisz nazwę, rozmiar lub kod kreskowy...');
    
    // Wpisz frazę do wyszukiwania
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'Testowa' } });
    });

    // Sprawdź czy filtrowanie działa
    await waitFor(() => {
      expect(screen.getByText('Kurtka Testowa')).toBeInTheDocument();
      expect(screen.queryByText('Inna Kurtka')).not.toBeInTheDocument();
    });
  });

  test('wyświetla przycisk "Przenieś" dla każdego produktu w magazynie', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    await waitFor(() => {
      const przeniesButtons = screen.getAllByText('Przenieś', { exact: false });
      expect(przeniesButtons).toHaveLength(2); // 2 produkty w magazynie
    });
  });

  test('wymaga wybrania użytkownika przed przeniesieniem produktu z magazynu', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    await waitFor(() => {
      const przeniesButton = screen.getAllByText('Przenieś', { exact: false })[0];
      
      // Kliknij przycisk bez wybrania użytkownika
      fireEvent.click(przeniesButton);
    });

    // Sprawdź czy pokazuje się alert
    expect(window.alert).toHaveBeenCalledWith(
      'Najpierw wybierz użytkownika do którego chcesz przenieść produkt!'
    );
  });

  test('przenosi produkt z magazynu do tabeli transferów po wybraniu użytkownika', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    // Wybierz użytkownika
    await waitFor(() => {
      const userSelect = screen.getByDisplayValue('-- Select User --');
      fireEvent.change(userSelect, { target: { value: 'user1' } });
    });

    // Kliknij przycisk przeniesienia
    await waitFor(() => {
      const przeniesButton = screen.getAllByText('Przenieś', { exact: false })[0];
      fireEvent.click(przeniesButton);
    });

    // Sprawdź czy produkt pojawił się w tabeli transferów
    await waitFor(() => {
      // Produkt powinien się pojawić w prawej sekcji (transfery)
      const transferRows = screen.getAllByRole('row');
      
      // Sprawdź czy jest więcej niż tylko nagłówek
      expect(transferRows.length).toBeGreaterThan(1);
      
      // Sprawdź czy produkt ma odpowiednie style (pomarańczowy)
      const transferRow = transferRows.find(row => 
        row.textContent.includes('Kurtka Testowa')
      );
      expect(transferRow).toBeInTheDocument();
    });
  });

  test('oznacza produkty z magazynu pomarańczowym kolorem w tabeli transferów', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    // Wybierz użytkownika
    await waitFor(() => {
      const userSelect = screen.getByDisplayValue('-- Select User --');
      fireEvent.change(userSelect, { target: { value: 'user1' } });
    });

    // Przenieś produkt
    await waitFor(() => {
      const przeniesButton = screen.getAllByText('Przenieś', { exact: false })[0];
      fireEvent.click(przeniesButton);
    });

    // Sprawdź style pomarańczowy (#ff8c00) 
    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      const transferRow = rows.find(row => 
        row.textContent.includes('Kurtka Testowa')
      );
      
      if (transferRow) {
        // Sprawdź czy ma pomarańczowy styl (może być w różnych formatach)
        const style = transferRow.style.backgroundColor;
        expect(style).toMatch(/(rgb\(255,\s*140,\s*0\)|#ff8c00|orange)/i);
      }
    });
  });

  test('wyświetla przycisk "Cofnij" dla produktów przeniesionych z magazynu', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    // Wybierz użytkownika i przenieś produkt
    await waitFor(() => {
      const userSelect = screen.getByDisplayValue('-- Select User --');
      fireEvent.change(userSelect, { target: { value: 'user1' } });
    });

    await waitFor(() => {
      const przeniesButton = screen.getAllByText('➤ Przenieś')[0];
      fireEvent.click(przeniesButton);
    });

    // Sprawdź czy przycisk "Cofnij" się pojawił
    await waitFor(() => {
      expect(screen.getByText('Cofnij', { exact: false })).toBeInTheDocument();
    });
  });

  test('cofa produkt z tabeli transferów z powrotem do magazynu', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    // Wybierz użytkownika i przenieś produkt
    await waitFor(() => {
      const userSelect = screen.getByDisplayValue('-- Select User --');
      fireEvent.change(userSelect, { target: { value: 'user1' } });
    });

    await waitFor(() => {
      const przeniesButton = screen.getAllByText('Przenieś', { exact: false })[0];
      fireEvent.click(przeniesButton);
    });

    // Kliknij przycisk cofnij
    await waitFor(() => {
      const cofnijButton = screen.getByText('Cofnij', { exact: false });
      fireEvent.click(cofnijButton);
    });

    // Sprawdź czy produkt wrócił do magazynu (lewa strona)
    await waitFor(() => {
      // Powinien być z powrotem w lewej sekcji magazynu
      const magazynSection = screen.getByText('📦 Magazyn').closest('div');
      expect(magazynSection).toHaveTextContent('Kurtka Testowa');
    });
  });

  test('usuwa produkty z magazynu wizualnie po przeniesieniu', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    // Sprawdź początkową liczbę produktów
    await waitFor(() => {
      expect(screen.getByText('Znaleziono: 2 produktów')).toBeInTheDocument();
    });

    // Wybierz użytkownika i przenieś produkt
    await waitFor(() => {
      const userSelect = screen.getByDisplayValue('-- Select User --');
      fireEvent.change(userSelect, { target: { value: 'user1' } });
    });

    await waitFor(() => {
      const przeniesButton = screen.getAllByText('➤ Przenieś')[0];
      fireEvent.click(przeniesButton);
    });

    // Sprawdź czy liczba produktów w magazynie się zmniejszyła
    await waitFor(() => {
      expect(screen.getByText('Znaleziono: 1 produktów')).toBeInTheDocument();
    });
  });

  test('filtruje użytkowników - wyklucza admin, magazyn i dom', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    await waitFor(() => {
      const userSelect = screen.getByDisplayValue('-- Select User --');
      const options = userSelect.querySelectorAll('option');
      
      // Sprawdź czy są tylko właściwi użytkownicy (+ opcja "Select User")
      expect(options).toHaveLength(3); // 1 placeholder + 2 właściwych użytkowników
      
      // Sprawdź czy admin i magazyn nie są na liście
      const optionTexts = Array.from(options).map(option => option.textContent);
      expect(optionTexts).not.toContain('admin');
      expect(optionTexts).not.toContain('magazyn');
    });
  });

  test('wyświetla poprawne dane produktu w tabeli transferów', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    // Wybierz użytkownika i przenieś produkt
    await waitFor(() => {
      const userSelect = screen.getByDisplayValue('-- Select User --');
      fireEvent.change(userSelect, { target: { value: 'user1' } });
    });

    await waitFor(() => {
      const przeniesButton = screen.getAllByText('➤ Przenieś')[0];
      fireEvent.click(przeniesButton);
    });

    // Sprawdź czy wszystkie dane są poprawnie wyświetlone
    await waitFor(() => {
      expect(screen.getByText('Kurtka Testowa')).toBeInTheDocument(); // Nazwa
      expect(screen.getByText('M')).toBeInTheDocument(); // Rozmiar  
      expect(screen.getByText('MAGAZYN')).toBeInTheDocument(); // Transfer_from
      expect(screen.getByText('Symbol1')).toBeInTheDocument(); // Transfer_to
      expect(screen.getByText('TEST123')).toBeInTheDocument(); // Product ID (barcode)
      expect(screen.getByText('Przeniesienie z magazynu')).toBeInTheDocument(); // Reason
    });
  });

});
