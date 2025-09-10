import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Corrections from './Corrections';

// Mock fetch
global.fetch = jest.fn();

describe('Corrections - Historia Update', () => {
  beforeEach(() => {
    fetch.mockClear();
    // Mock window.alert i window.confirm
    window.alert = jest.fn();
    window.confirm = jest.fn(() => true);
  });

  test('Aktualizuje historię po rozwiązaniu korekty', async () => {
    // 🎯 TEST: Transfer M→P (fail) → Korekta → Znajdź w K → Historia: K→P

    // Mock danych korekt
    const mockCorrections = [
      {
        _id: 'correction1',
        fullName: 'Ada CZERWONY',
        size: '2XL',
        barcode: '68c1d295963aba5e4243b8db',
        sellingPoint: 'Krupówki',
        symbol: 'M',
        transactionId: 'trans123',
        attemptedOperation: 'TRANSFER',
        status: 'PENDING'
      }
    ];

    // Mock dostępnych lokalizacji (produkt znaleziony w K)
    const mockAvailableLocations = [
      {
        symbol: 'K', 
        items: [
          {
            barcode: '68c1d295963aba5e4243b8db',
            fullName: 'Ada CZERWONY',
            size: '2XL'
          }
        ]
      }
    ];

    // Mock odpowiedzi API
    fetch.mockImplementation((url, options) => {
      console.log('🧪 Test fetch call:', url, options?.method);

      // GET /api/corrections - pobierz korekty
      if (url.includes('/api/corrections') && !options) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockCorrections)
        });
      }

      // GET /api/corrections/stats - statystyki
      if (url.includes('/api/corrections/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ unresolved: 1, resolved: 0 })
        });
      }

      // POST /api/state/search - znajdź produkt w innych punktach  
      if (url.includes('/api/state/search')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAvailableLocations)
        });
      }

      // GET /api/state - pobierz wszystkie stany (używane w komponencie)
      if (url.includes('/api/state') && !url.includes('search') && !options) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            {
              _id: 'state1',
              fullName: 'Ada CZERWONY',  // 🔧 NAPRAWIONE: prostszy string zamiast obiektu
              size: '2XL',               // 🔧 NAPRAWIONE: prostszy string zamiast obiektu  
              barcode: '68c1d295963aba5e4243b8db',
              symbol: 'K'                // 🔧 NAPRAWIONE: symbol bezpośrednio, nie w sellingPoint
            }
          ])
        });
      }

      // DELETE /api/state/barcode/{barcode}/symbol/{symbol} - odpisz produkt (write-off)
      if (url.includes('/api/state/barcode/') && options?.method === 'DELETE') {
        console.log('🔥 Write-off call detected');
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'Odpisano ze stanu' })
        });
      }

      // PUT /api/history/update-correction-to-transfer - aktualizuj historię
      if (url.includes('/api/history/update-correction-to-transfer') && options?.method === 'PUT') {
        console.log('📝 Historia update call:', JSON.parse(options.body));
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            message: 'Historia została zaktualizowana',
            updatedEntry: {
              operation: 'Odpisano ze stanu (transfer)',
              from: 'K',
              to: 'P'
            }
          })
        });
      }

      // PUT /api/corrections/{id}/status - oznacz jako rozwiązaną
      if (url.includes('/api/corrections/') && url.includes('/status')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'RESOLVED' })
        });
      }

      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({})
      });
    });

    // Renderuj komponent
    render(<Corrections />);

    // Czekaj aż korekty się załadują
    await waitFor(() => {
      expect(screen.getByText('Ada CZERWONY')).toBeInTheDocument();
    });

    // Kliknij przycisk "Wskaż produkt"
    const wskazButton = screen.getByText('Wskaż produkt');
    fireEvent.click(wskazButton);

    // Czekaj na modal  
    await waitFor(() => {
      expect(screen.getByText('Lokalizacje produktu')).toBeInTheDocument();
    });

    // Kliknij przycisk "Odpisz ze stanu" (rzeczywisty tekst przycisku)
    const odpiszButton = screen.getByText('Odpisz ze stanu');
    fireEvent.click(odpiszButton);

    // Kliknij ponownie po potwierdzeniu (confirm już zmockowany w beforeEach)
    fireEvent.click(odpiszButton);

    // Sprawdź czy zostały wykonane odpowiednie wywołania API
    await waitFor(() => {
      // Sprawdź czy wywołano write-off (usunięcie ze stanu)
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/state/barcode/68c1d295963aba5e4243b8db/symbol/K'),
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'operation-type': 'write-off'
          })
        })
      );

      // Sprawdź czy wywołano aktualizację historii
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/history/update-correction-to-transfer'),
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('"correctFromSymbol":"K"')
        })
      );

      // Sprawdź czy oznaczono korektę jako rozwiązaną
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/corrections/correction1'),
        expect.objectContaining({
          method: 'PUT'
        })
      );
    });

    console.log('✅ Test zakończony pomyślnie');
  });

  test('Prawidłowe dane w wywołaniu aktualizacji historii', async () => {
    // Uproszczony test sprawdzający tylko dane wysyłane do API

    const mockCorrections = [{
      _id: 'correction1',
      fullName: 'Test Product',
      size: 'L',
      barcode: 'test123',
      transactionId: 'trans456',
      attemptedOperation: 'TRANSFER',
      status: 'PENDING'
    }];

    const mockAvailableLocations = [{
      symbol: 'S', 
      items: [{ barcode: 'test123', fullName: 'Test Product', size: 'L' }]
    }];

    let historyUpdateData = null;

    fetch.mockImplementation((url, options) => {
      if (url.includes('/api/corrections') && !options) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockCorrections)
        });
      }

      if (url.includes('/api/corrections/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ unresolved: 1, resolved: 0 })
        });
      }

      if (url.includes('/api/state/search')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAvailableLocations)
        });
      }

      if (url.includes('/api/state') && !url.includes('search') && !url.includes('barcode') && !options) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            {
              _id: 'state1',
              fullName: 'Test Product',  // 🔧 NAPRAWIONE: prostszy string
              size: 'L',                 // 🔧 NAPRAWIONE: prostszy string
              barcode: 'test123',
              symbol: 'S'                // 🔧 NAPRAWIONE: symbol bezpośrednio
            }
          ])
        });
      }

      if (url.includes('/api/state/barcode/') && options?.method === 'DELETE') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }

      if (url.includes('/api/history/update-correction-to-transfer')) {
        historyUpdateData = JSON.parse(options.body);
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }

      if (url.includes('/status')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }

      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
    });

    render(<Corrections />);

    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Wskaż produkt'));
    
    await waitFor(() => {
      expect(screen.getByText('Odpisz ze stanu')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Odpisz ze stanu'));

    await waitFor(() => {
      expect(historyUpdateData).not.toBeNull();
    });

    // Sprawdź strukturę danych wysłanych do aktualizacji historii
    expect(historyUpdateData).toEqual({
      transactionId: 'trans456',
      correctFromSymbol: 'S',
      productDescription: 'Test Product L',
      userEmail: 'admin@wp.pl'
    });

    console.log('✅ Test danych historii zakończony pomyślnie');
  });
});
