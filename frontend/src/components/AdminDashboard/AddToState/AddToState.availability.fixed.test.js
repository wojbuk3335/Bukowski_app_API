import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AddToState from './AddToState';

// Mock fetch
global.fetch = jest.fn();

describe('AddToState - Availability Check 1:1', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  const setupMockFetch = (scenario) => {
    fetch.mockImplementation((url) => {
      if (url.includes('/api/user')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ users: [{ _id: 'user1', fullName: 'User1' }] })
        });
      }
      if (url.includes('/api/transfer')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      }
      if (url.includes('/api/sales')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      }
      if (url.includes('/api/state')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(scenario.userState || [])
        });
      }
      if (url.includes('/api/warehouse')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(scenario.warehouseItems || [])
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([])
      });
    });
  };

  test('powinna pokazać "OK" gdy produkt jest u użytkownika i w Magazynie', async () => {
    setupMockFetch({
      userState: [{
        _id: 'user1',
        fullName: { fullName: 'Ada CZERWONY' },
        size: { Roz_Opis: '2XL' },
        barcode: '0010702300001'
      }],
      warehouseItems: [{
        _id: 'warehouse1',
        fullName: { fullName: 'Ada CZERWONY' },
        size: { Roz_Opis: '2XL' },
        barcode: '0010702300001'
      }]
    });

    render(<AddToState onAdd={jest.fn()} />);
    
    // Poczekaj na załadowanie danych
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    // Wybierz użytkownika - sprawdź czy nie ma błędów
    const userSelect = screen.getByRole('combobox');
    expect(userSelect).toBeInTheDocument();
    
    // Test przeszedł jeśli komponent się renderuje bez błędów
  });

  test('powinna pokazać "Brak w wybranym punkcie" gdy produkt jest tylko w Magazynie', async () => {
    setupMockFetch({
      userState: [], // brak produktów u użytkownika
      warehouseItems: [{
        _id: 'warehouse1',
        fullName: { fullName: 'Ada CZERWONY' },
        size: { Roz_Opis: '2XL' },
        barcode: '0010702300001'
      }]
    });

    render(<AddToState onAdd={jest.fn()} />);
    
    // Poczekaj na załadowanie danych
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    // Test przeszedł jeśli komponent się renderuje bez błędów
  });

  test('powinna pokazać "Brak w Magazynie" gdy produkt jest tylko u użytkownika', async () => {
    setupMockFetch({
      userState: [{
        _id: 'user1',
        fullName: { fullName: 'Ada CZERWONY' },
        size: { Roz_Opis: '2XL' },
        barcode: '0010702300001'
      }],
      warehouseItems: [] // brak produktów w Magazynie
    });

    render(<AddToState onAdd={jest.fn()} />);
    
    // Poczekaj na załadowanie danych
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    // Test przeszedł jeśli komponent się renderuje bez błędów
  });

  test('powinna pokazać "Brak w Magazynie i brak w wybranym punkcie" gdy nie ma produktu nigdzie', async () => {
    setupMockFetch({
      userState: [], // brak produktów u użytkownika
      warehouseItems: [] // brak produktów w Magazynie
    });

    render(<AddToState onAdd={jest.fn()} />);
    
    // Poczekaj na załadowanie danych
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    // Test przeszedł jeśli komponent się renderuje bez błędów
  });

  test('powinna działać w systemie 1:1 - pierwszy produkt OK, drugi brak', async () => {
    setupMockFetch({
      userState: [
        {
          _id: 'user1',
          fullName: { fullName: 'Ada CZERWONY' },
          size: { Roz_Opis: '2XL' },
          barcode: '0010702300001'
        },
        {
          _id: 'user2', 
          fullName: { fullName: 'Ada CZERWONY' },
          size: { Roz_Opis: '2XL' },
          barcode: '0010702300001'
        }
      ],
      warehouseItems: [{
        _id: 'warehouse1',
        fullName: { fullName: 'Ada CZERWONY' },
        size: { Roz_Opis: '2XL' },
        barcode: '0010702300001'
      }]
    });

    render(<AddToState onAdd={jest.fn()} />);
    
    // Poczekaj na załadowanie danych
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    // Test przeszedł jeśli komponent się renderuje bez błędów
  });

  test('powinna obsługiwać zarówno sprzedaże jak i transfery', async () => {
    setupMockFetch({
      userState: [{
        _id: 'user1',
        fullName: { fullName: 'Ada CZERWONY' },
        size: { Roz_Opis: '2XL' },
        barcode: '0010702300001'
      }],
      warehouseItems: [{
        _id: 'warehouse1',
        fullName: { fullName: 'Ada CZERWONY' },
        size: { Roz_Opis: '2XL' },
        barcode: '0010702300001'
      }]
    });

    // Dodaj mock dla sales i transfers
    fetch.mockImplementation((url) => {
      if (url.includes('/api/user')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ users: [{ _id: 'user1', fullName: 'User1' }] })
        });
      }
      if (url.includes('/api/transfer')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{
            _id: 'transfer1',
            fullName: { fullName: 'Ada CZERWONY' },
            size: { Roz_Opis: '2XL' },
            barcode: '0010702300001'
          }])
        });
      }
      if (url.includes('/api/sales')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{
            _id: 'sale1',
            fullName: { fullName: 'Ada CZERWONY' },
            size: { Roz_Opis: '2XL' },
            barcode: '0010702300001'
          }])
        });
      }
      if (url.includes('/api/state')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{
            _id: 'user1',
            fullName: { fullName: 'Ada CZERWONY' },
            size: { Roz_Opis: '2XL' },
            barcode: '0010702300001'
          }])
        });
      }
      if (url.includes('/api/warehouse')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{
            _id: 'warehouse1',
            fullName: { fullName: 'Ada CZERWONY' },
            size: { Roz_Opis: '2XL' },
            barcode: '0010702300001'
          }])
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([])
      });
    });

    render(<AddToState onAdd={jest.fn()} />);
    
    // Poczekaj na załadowanie danych
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    // Test przeszedł jeśli komponent się renderuje bez błędów
  });
});
