import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import Sales from './Sales';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('Sales Component Integration Tests', () => {
    const mockSalesData = [
        {
            _id: '1',
            fullName: 'IR 3212.313 BRÁZOWY',
            date: '2025-10-05',
            sellingPoint: 'Tata',
            size: '-',
            barcode: '0000401003136',
            timestamp: '2025-10-05T07:53:51.205Z',
            cash: [{ price: 250, currency: 'PLN' }],
            card: []
        },
        {
            _id: '2',
            fullName: 'Test Jacket Blue',
            date: '2025-10-04',
            sellingPoint: 'Store A',
            size: 'M',
            barcode: '1234567890',
            timestamp: '2025-10-04T10:00:00Z',
            cash: [],
            card: [{ price: 180, currency: 'PLN' }]
        },
        {
            _id: '3',
            fullName: 'Mixed Payment Item',
            date: '2025-10-03',
            sellingPoint: 'Store B',
            size: 'L',
            barcode: '9876543210',
            timestamp: '2025-10-03T15:30:00Z',
            cash: [{ price: 100, currency: 'PLN' }],
            card: [{ price: 50, currency: 'PLN' }]
        }
    ];

    beforeEach(() => {
        mockedAxios.get.mockClear();
        // Mock the specific endpoint that Sales component uses
        mockedAxios.get.mockImplementation((url) => {
            if (url === '/api/sales') {
                return Promise.resolve({ data: mockSalesData });
            }
            return Promise.reject(new Error('Not found'));
        });
    });

    test('should render Sales component with all data', async () => {
        render(<Sales />);

        // Wait for data to be loaded asynchronously
        await waitFor(() => {
            expect(screen.getByText('IR 3212.313 BRÁZOWY')).toBeInTheDocument();
        });

        expect(screen.getByText('Test Jacket Blue')).toBeInTheDocument();
        expect(screen.getByText('Mixed Payment Item')).toBeInTheDocument();

        expect(screen.getByText('250 PLN (Gotówka)')).toBeInTheDocument();
        expect(screen.getByText('180 PLN (Karta)')).toBeInTheDocument();
        expect(screen.getByText('100 PLN (Gotówka)')).toBeInTheDocument();
        expect(screen.getByText('50 PLN (Karta)')).toBeInTheDocument();
    });

    test('should filter sales by search query', async () => {
        render(<Sales />);

        await waitFor(() => {
            expect(screen.getByText('IR 3212.313 BRÁZOWY')).toBeInTheDocument();
        });

        const searchInput = screen.getByPlaceholderText('Wyszukaj...');
        fireEvent.change(searchInput, { target: { value: 'BRÁZOWY' } });

        await waitFor(() => {
            expect(screen.queryByText('Test Jacket Blue')).not.toBeInTheDocument();
            expect(screen.queryByText('Mixed Payment Item')).not.toBeInTheDocument();
        });
    });

    test('should sort table columns', async () => {
        render(<Sales />);

        await waitFor(() => {
            expect(screen.getByText('IR 3212.313 BRÁZOWY')).toBeInTheDocument();
        });

        const fullNameHeader = screen.getByText(/Pełna nazwa/);
        fireEvent.click(fullNameHeader);

        // Verify sorting indicator appears
        await waitFor(() => {
            expect(screen.getByText(/Pełna nazwa.*↑/)).toBeInTheDocument();
        });
    });

    test('should filter by selling point dropdown', async () => {
        render(<Sales />);

        // Wait for data to load
        await waitFor(() => {
            expect(screen.getByText('IR 3212.313 BRÁZOWY')).toBeInTheDocument();
        });

        // Find the selling point dropdown
        const sellingPointDropdowns = screen.getAllByRole('combobox');
        const sellingPointDropdown = sellingPointDropdowns[0]; // First dropdown should be selling point

        fireEvent.change(sellingPointDropdown, { target: { value: 'Tata' } });

        // After filtering, only Tata items should be visible
        await waitFor(() => {
            expect(screen.getByText('IR 3212.313 BRÁZOWY')).toBeInTheDocument();
            expect(screen.queryByText('Test Jacket Blue')).not.toBeInTheDocument();
            expect(screen.queryByText('Mixed Payment Item')).not.toBeInTheDocument();
        });
    });

    test('should show total revenue calculation', async () => {
        render(<Sales />);

        // Wait for data to be loaded
        await waitFor(() => {
            expect(screen.getByText('IR 3212.313 BRÁZOWY')).toBeInTheDocument();
        });

        // Check if total revenue calculation is correct: 250 + 180 + 100 + 50 = 580 PLN
        await waitFor(() => {
            expect(screen.getByText('Łączne przychody:')).toBeInTheDocument();
            expect(screen.getByText(/580\.00/)).toBeInTheDocument();
        });
    });

    test('should filter search results', async () => {
        render(<Sales />);

        // Wait for initial data to be loaded
        await waitFor(() => {
            expect(screen.getByText('IR 3212.313 BRÁZOWY')).toBeInTheDocument();
        });

        // Apply search filter
        const searchInput = screen.getByPlaceholderText('Wyszukaj...');
        fireEvent.change(searchInput, { target: { value: 'BRÁZOWY' } });

        // Items not matching should be hidden
        await waitFor(() => {
            expect(screen.queryByText('Test Jacket Blue')).not.toBeInTheDocument();
        });

        // Clear search manually
        fireEvent.change(searchInput, { target: { value: '' } });

        // All items should be visible again
        await waitFor(() => {
            expect(screen.getByText('Test Jacket Blue')).toBeInTheDocument();
        });
    });

    test('should display correct payment information for real case', async () => {
        // Test the exact case from user's scenario
        const realCaseData = [
            {
                _id: '1',
                fullName: 'IR 3212.313 BRÁZOWY',
                date: '2025-10-05',
                sellingPoint: 'Tata',
                size: '-',
                barcode: '0000401003136',
                timestamp: '2025-10-05T07:53:51.205Z',
                cash: [{ price: 250, currency: 'PLN' }],
                card: []
            }
        ];

        mockedAxios.get.mockImplementation((url) => {
            if (url === '/api/sales') {
                return Promise.resolve({ data: realCaseData });
            }
            return Promise.reject(new Error('Not found'));
        });

        render(<Sales />);

        // Wait for data to be loaded
        await waitFor(() => {
            expect(screen.getByText('IR 3212.313 BRÁZOWY')).toBeInTheDocument();
        });
        
        // Use getAllByText to handle duplicate "Tata" in dropdown and table
        const tataElements = screen.getAllByText('Tata');
        expect(tataElements.length).toBeGreaterThan(0);
        
        expect(screen.getByText('0000401003136')).toBeInTheDocument();
        expect(screen.getByText('250 PLN (Gotówka)')).toBeInTheDocument();
        expect(screen.queryByText('Brak płatności')).not.toBeInTheDocument();
    });

    test('should handle payment with no cash or card arrays (legacy data)', async () => {
        const legacyData = [
            {
                _id: '1',
                fullName: 'Legacy Item',
                date: '2025-10-05',
                sellingPoint: 'Old Store',
                size: 'M',
                barcode: '1111222233',
                timestamp: '2025-10-05T10:00:00Z'
                // No cash or card properties
            }
        ];

        mockedAxios.get.mockImplementation((url) => {
            if (url === '/api/sales') {
                return Promise.resolve({ data: legacyData });
            }
            return Promise.reject(new Error('Not found'));
        });

        render(<Sales />);

        await waitFor(() => {
            expect(screen.getByText('Legacy Item')).toBeInTheDocument();
        });
        
        expect(screen.getByText('Brak płatności')).toBeInTheDocument();
    });
});