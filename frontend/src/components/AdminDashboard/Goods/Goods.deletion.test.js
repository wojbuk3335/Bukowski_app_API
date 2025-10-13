import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Goods from './Goods';

// Mock fetch API
global.fetch = jest.fn();

// Mock alert
global.alert = jest.fn();

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
};
global.localStorage = localStorageMock;

describe('Goods Deletion - Frontend Integration Test', () => {
    beforeEach(() => {
        fetch.mockClear();
        alert.mockClear();
        localStorageMock.getItem.mockReturnValue('test-token');
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    const mockGoods = [
        {
            _id: '507f1f77bcf86cd799439011',
            fullName: 'TestProduct',
            category: 'TestCategory',
            price: 100,
            code: 'TEST001',
            color: 'Red'
        }
    ];

    test('should handle successful product deletion with price list sync', async () => {
        console.log('🔍 TEST: Usuwanie produktu z automatycznym usunięciem z cenników');
        
        // Mock initial fetch for goods list
        fetch
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockGoods
            })
            // Mock successful deletion response
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    message: 'Good deleted successfully and removed from all price lists',
                    removedFromPriceLists: 6
                })
            })
            // Mock refresh fetch after deletion
            .mockResolvedValueOnce({
                ok: true,
                json: async () => []
            });

        render(<Goods />);

        // Wait for initial data to load
        await waitFor(() => {
            expect(screen.getByText('TestProduct')).toBeInTheDocument();
        });

        console.log('✅ Komponent załadowany z produktem TestProduct');

        // Find and click delete button
        const deleteButton = screen.getAllByText('Usuń')[0];
        fireEvent.click(deleteButton);

        console.log('✅ Kliknięto przycisk Usuń');

        // Confirm deletion in modal
        await waitFor(() => {
            expect(screen.getByText('Czy na pewno chcesz usunąć ten produkt?')).toBeInTheDocument();
        });

        const confirmButton = screen.getByText('Tak, usuń');
        fireEvent.click(confirmButton);

        console.log('✅ Potwierdzono usunięcie w modalu');

        // Verify API calls
        await waitFor(() => {
            expect(fetch).toHaveBeenCalledTimes(3);
        });

        // Check delete API call
        const deleteCall = fetch.mock.calls[1];
        expect(deleteCall[0]).toContain('/api/goods/507f1f77bcf86cd799439011');
        expect(deleteCall[1].method).toBe('DELETE');

        console.log('✅ API call dla usunięcia produktu wykonany poprawnie');

        // Verify success alert was called
        await waitFor(() => {
            expect(alert).toHaveBeenCalledWith(
                'Produkt został usunięty pomyślnie i automatycznie usunięty ze wszystkich cenników!'
            );
        });

        console.log('✅ Alert o sukcesie wyświetlony z informacją o usunięciu z cenników');

        // Verify data refresh was called
        const refreshCall = fetch.mock.calls[2];
        expect(refreshCall[0]).toContain('/api/goods');
        expect(refreshCall[1].method).toBe('GET');

        console.log('✅ Lista produktów odświeżona po usunięciu');
        console.log('🎯 TEST PASSED: Automatyczne usuwanie z cenników działa poprawnie');
    });

    test('should handle deletion response without price list sync info', async () => {
        console.log('🔍 TEST: Obsługa odpowiedzi bez informacji o synchronizacji cenników');
        
        // Mock responses
        fetch
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockGoods
            })
            // Mock simple deletion response (legacy format)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    message: 'Good deleted successfully'
                })
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => []
            });

        render(<Goods />);

        await waitFor(() => {
            expect(screen.getByText('TestProduct')).toBeInTheDocument();
        });

        const deleteButton = screen.getAllByText('Usuń')[0];
        fireEvent.click(deleteButton);

        await waitFor(() => {
            expect(screen.getByText('Czy na pewno chcesz usunąć ten produkt?')).toBeInTheDocument();
        });

        const confirmButton = screen.getByText('Tak, usuń');
        fireEvent.click(confirmButton);

        // Verify that basic success message is shown even without price list info
        await waitFor(() => {
            expect(alert).toHaveBeenCalledWith('Produkt został usunięty pomyślnie!');
        });

        console.log('✅ TEST PASSED: Obsługa legacy odpowiedzi działa poprawnie');
    });

    test('should handle deletion error gracefully', async () => {
        console.log('🔍 TEST: Obsługa błędów podczas usuwania');
        
        // Mock responses
        fetch
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockGoods
            })
            // Mock error response
            .mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: async () => ({
                    message: 'Internal server error'
                })
            });

        render(<Goods />);

        await waitFor(() => {
            expect(screen.getByText('TestProduct')).toBeInTheDocument();
        });

        const deleteButton = screen.getAllByText('Usuń')[0];
        fireEvent.click(deleteButton);

        await waitFor(() => {
            expect(screen.getByText('Czy na pewno chcesz usunąć ten produkt?')).toBeInTheDocument();
        });

        const confirmButton = screen.getByText('Tak, usuń');
        fireEvent.click(confirmButton);

        // Verify error alert
        await waitFor(() => {
            expect(alert).toHaveBeenCalledWith('Wystąpił błąd podczas usuwania produktu.');
        });

        console.log('✅ TEST PASSED: Błędy obsługiwane poprawnie');
    });

    test('should immediately update UI after successful deletion', async () => {
        console.log('🔍 TEST: Natychmiastowa aktualizacja UI po usunięciu');
        
        // Mock responses
        fetch
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockGoods
            })
            // Mock successful deletion
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    message: 'Good deleted successfully and removed from all price lists'
                })
            })
            // Mock empty list after deletion
            .mockResolvedValueOnce({
                ok: true,
                json: async () => []
            });

        render(<Goods />);

        // Verify product is initially visible
        await waitFor(() => {
            expect(screen.getByText('TestProduct')).toBeInTheDocument();
        });

        const deleteButton = screen.getAllByText('Usuń')[0];
        fireEvent.click(deleteButton);

        await waitFor(() => {
            expect(screen.getByText('Czy na pewno chcesz usunąć ten produkt?')).toBeInTheDocument();
        });

        const confirmButton = screen.getByText('Tak, usuń');
        fireEvent.click(confirmButton);

        // Verify product is no longer visible (UI updated immediately)
        await waitFor(() => {
            expect(screen.queryByText('TestProduct')).not.toBeInTheDocument();
        });

        console.log('✅ TEST PASSED: UI aktualizuje się natychmiast po usunięciu');
    });

    test('should use includes() method for response message checking', async () => {
        console.log('🔍 TEST: Sprawdzanie używania includes() do weryfikacji odpowiedzi');
        
        // Mock responses with extended message
        fetch
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockGoods
            })
            // Mock response with additional info
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    message: 'Good deleted successfully and removed from all price lists. Affected 6 price lists.'
                })
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => []
            });

        render(<Goods />);

        await waitFor(() => {
            expect(screen.getByText('TestProduct')).toBeInTheDocument();
        });

        const deleteButton = screen.getAllByText('Usuń')[0];
        fireEvent.click(deleteButton);

        await waitFor(() => {
            expect(screen.getByText('Czy na pewno chcesz usunąć ten produkt?')).toBeInTheDocument();
        });

        const confirmButton = screen.getByText('Tak, usuń');
        fireEvent.click(confirmButton);

        // Should still show success message even with extended response
        await waitFor(() => {
            expect(alert).toHaveBeenCalledWith(
                'Produkt został usunięty pomyślnie i automatycznie usunięty ze wszystkich cenników!'
            );
        });

        console.log('✅ TEST PASSED: includes() method działa z różnymi formatami odpowiedzi');
    });
});

console.log(`
🧪 GOODS DELETION FRONTEND TESTS
================================

Te testy sprawdzają:
✅ Automatyczne usuwanie produktów z cenników
✅ Natychmiastową aktualizację UI
✅ Poprawną obsługę różnych formatów odpowiedzi
✅ Graceful error handling
✅ Używanie includes() zamiast exact match

Kluczowe funkcjonalności:
- handleDeleteProduct używa includes() do sprawdzania odpowiedzi
- Alert informuje o automatycznym usunięciu z cenników  
- fetchGoods() wywoływane natychmiast po sukcesie
- Obsługa zarówno nowych jak i starych formatów odpowiedzi

Uruchom testy: npm test Goods.deletion.test.js
`);