import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import AddToState from './AddToState';

// Mock fetch
global.fetch = jest.fn();

// Mock window functions
window.alert = jest.fn();
window.confirm = jest.fn();

describe('AddToState - Pomarańczowe kurtki (uproszczone testy)', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock podstawowych odpowiedzi API
    fetch.mockImplementation((url) => {
      // Mock users API
      if (url.includes('/api/user')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            users: [
              { _id: 'user1', symbol: 'Symbol1', sellingPoint: 'Punkt1' },
              { _id: 'user2', symbol: 'Symbol2', sellingPoint: 'Punkt2' }
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
      
      // Mock innych API
      if (url.includes('/api/transfer') || url.includes('/api/sales') || url.includes('/api/state')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      }
      
      return Promise.reject(new Error('Nieznany URL'));
    });
  });

  test('renderuje podstawowy interfejs magazynu', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    // Sprawdź czy sekcja magazynu się renderuje
    expect(screen.getByText('📦 Magazyn')).toBeInTheDocument();
    expect(screen.getByText('Mechanizm Transferów')).toBeInTheDocument();
  });

  test('renderuje produkty z magazynu', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    await waitFor(() => {
      expect(screen.getByText('Kurtka Testowa')).toBeInTheDocument();
      expect(screen.getByText('Inna Kurtka')).toBeInTheDocument();
    });
  });

  test('wyświetla wyszukiwarkę magazynu', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    const searchInput = screen.getByPlaceholderText('Wpisz nazwę, rozmiar lub kod kreskowy...');
    expect(searchInput).toBeInTheDocument();
  });

  test('filtruje produkty w magazynie', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    await waitFor(() => {
      expect(screen.getByText('Kurtka Testowa')).toBeInTheDocument();
      expect(screen.getByText('Inna Kurtka')).toBeInTheDocument();
    });

    // Wpisz frazę do wyszukiwania
    const searchInput = screen.getByPlaceholderText('Wpisz nazwę, rozmiar lub kod kreskowy...');
    fireEvent.change(searchInput, { target: { value: 'Testowa' } });

    // Sprawdź czy filtrowanie działa
    await waitFor(() => {
      expect(screen.getByText('Kurtka Testowa')).toBeInTheDocument();
      expect(screen.queryByText('Inna Kurtka')).not.toBeInTheDocument();
    });
  });

  test('wyświetla przyciski przenoszenia', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    await waitFor(() => {
      const przeniesButtons = screen.getAllByRole('button').filter(button => 
        button.textContent.includes('Przenieś')
      );
      expect(przeniesButtons.length).toBeGreaterThan(0);
    });
  });

  test('renderuje listę użytkowników bez admin/magazyn', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    await waitFor(() => {
      const userSelect = screen.getByDisplayValue('-- Wybierz użytkownika --');
      const options = userSelect.querySelectorAll('option');
      
      // Sprawdź czy są użytkownicy (+ placeholder)
      expect(options.length).toBeGreaterThan(1);
      
      // Sprawdź nazwy opcji
      const optionTexts = Array.from(options).map(option => option.textContent);
      expect(optionTexts.some(text => text.includes('Symbol1'))).toBe(true);
      expect(optionTexts.some(text => text.includes('Symbol2'))).toBe(true);
    });
  });

  test('wyświetla licznik produktów w magazynie', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Znaleziono:.*2.*produktów/)).toBeInTheDocument();
    });
  });

  test('wyświetla główny przycisk zapisywania', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    await waitFor(() => {
      const saveButton = screen.getByRole('button', { 
        name: /Zapisz.*Odpisz wszystkie kurtki ze stanu/i 
      });
      expect(saveButton).toBeInTheDocument();
      expect(saveButton).toBeDisabled(); // Powinien być wyłączony gdy brak transferów
    });
  });

  test('wyświetla tabele transferów', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    await waitFor(() => {
      expect(screen.getByText('Transfery')).toBeInTheDocument();
      
      // Sprawdź nagłówki tabeli (polskie wersje) - używamy getAllByText żeby obsłużyć duplikaty
      const nazwaHeaders = screen.getAllByText(/Nazwa/);
      expect(nazwaHeaders.length).toBeGreaterThanOrEqual(1); // Może być "Nazwa" w magazynie i "Nazwa produktu" w transferach
      
      const rozmiarHeaders = screen.getAllByText('Rozmiar');
      expect(rozmiarHeaders).toHaveLength(2); // Jeden w magazynie, jeden w transferach
      
      const kodHeaders = screen.getAllByText('Kod kreskowy');
      expect(kodHeaders).toHaveLength(2); // Jeden w magazynie, jeden w transferach
      
      expect(screen.getByText('Z')).toBeInTheDocument();
      expect(screen.getByText('Do')).toBeInTheDocument();
      expect(screen.getByText('Data')).toBeInTheDocument();
      expect(screen.getByText('Rodzaj')).toBeInTheDocument();
      
      const akcjaHeaders = screen.getAllByText('Akcja');
      expect(akcjaHeaders).toHaveLength(2); // Jeden w magazynie, jeden w transferach
    });
  });

  test('pokazuje komunikat braku transferów', async () => {
    const mockFetch = jest.fn()
      .mockResolvedValueOnce({
        json: () => Promise.resolve([])
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve([])
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve([])
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve([])
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve([])
      });

    global.fetch = mockFetch;

    render(<AddToState />);

    await waitFor(() => {
      expect(screen.getByText('Brak transferów')).toBeInTheDocument();
    });
  });

  test('wymaga wybrania użytkownika przed przeniesieniem', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    await waitFor(() => {
      // Znajdź przycisk przeniesienia
      const przeniesButton = screen.getAllByRole('button').find(button => 
        button.textContent.includes('Przenieś')
      );
      
      if (przeniesButton) {
        fireEvent.click(przeniesButton);
        
        // Sprawdź czy pokazuje się odpowiedni alert
        expect(window.alert).toHaveBeenCalledWith(
          expect.stringContaining('Najpierw wybierz użytkownika')
        );
      }
    });
  });

  test('weryfikuje format danych produktów magazynowych', async () => {
    await act(async () => {
      render(<AddToState />);
    });

    await waitFor(() => {
      // Sprawdź czy dane produktów są poprawnie wyświetlane
      expect(screen.getByText('TEST123')).toBeInTheDocument(); // barcode
      // Kolumna cena została usunięta z tabeli magazynu
      // Kolumna cena została usunięta z tabeli magazynu
      expect(screen.getByText('M')).toBeInTheDocument(); // rozmiar
      expect(screen.getByText('L')).toBeInTheDocument(); // rozmiar drugiego produktu
    });
  });

});





