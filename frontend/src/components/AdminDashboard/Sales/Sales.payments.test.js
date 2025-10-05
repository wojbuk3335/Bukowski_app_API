import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import Sales from './Sales';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('Sales Payments Display Tests', () => {
    beforeEach(() => {
        mockedAxios.get.mockClear();
    });

    test('should display cash payment correctly', async () => {
        const mockSalesData = [
            {
                _id: '1',
                fullName: 'Test Product',
                date: '2025-10-05',
                sellingPoint: 'Test Point',
                size: 'M',
                barcode: '123456789',
                timestamp: '2025-10-05T10:00:00Z',
                cash: [
                    { price: 250, currency: 'PLN' }
                ],
                card: []
            }
        ];

        mockedAxios.get.mockResolvedValue({ data: mockSalesData });

        render(<Sales />);

        await waitFor(() => {
            expect(screen.getByText('250 PLN (Gotówka)')).toBeInTheDocument();
        });
    });

    test('should display card payment correctly', async () => {
        const mockSalesData = [
            {
                _id: '2',
                fullName: 'Test Product 2',
                date: '2025-10-05',
                sellingPoint: 'Test Point',
                size: 'L',
                barcode: '987654321',
                timestamp: '2025-10-05T11:00:00Z',
                cash: [],
                card: [
                    { price: 150, currency: 'PLN' }
                ]
            }
        ];

        mockedAxios.get.mockResolvedValue({ data: mockSalesData });

        render(<Sales />);

        await waitFor(() => {
            expect(screen.getByText('150 PLN (Karta)')).toBeInTheDocument();
        });
    });

    test('should display multiple payments (cash and card)', async () => {
        const mockSalesData = [
            {
                _id: '3',
                fullName: 'Mixed Payment Product',
                date: '2025-10-05',
                sellingPoint: 'Test Point',
                size: 'XL',
                barcode: '555666777',
                timestamp: '2025-10-05T12:00:00Z',
                cash: [
                    { price: 100, currency: 'PLN' }
                ],
                card: [
                    { price: 50, currency: 'PLN' }
                ]
            }
        ];

        mockedAxios.get.mockResolvedValue({ data: mockSalesData });

        render(<Sales />);

        await waitFor(() => {
            expect(screen.getByText('100 PLN (Gotówka)')).toBeInTheDocument();
            expect(screen.getByText('50 PLN (Karta)')).toBeInTheDocument();
        });
    });

    test('should display multiple cash payments', async () => {
        const mockSalesData = [
            {
                _id: '4',
                fullName: 'Multiple Cash Product',
                date: '2025-10-05',
                sellingPoint: 'Test Point',
                size: 'S',
                barcode: '111222333',
                timestamp: '2025-10-05T13:00:00Z',
                cash: [
                    { price: 200, currency: 'PLN' },
                    { price: 50, currency: 'PLN' }
                ],
                card: []
            }
        ];

        mockedAxios.get.mockResolvedValue({ data: mockSalesData });

        render(<Sales />);

        await waitFor(() => {
            expect(screen.getByText('200 PLN (Gotówka)')).toBeInTheDocument();
            expect(screen.getByText('50 PLN (Gotówka)')).toBeInTheDocument();
        });
    });

    test('should display "Brak płatności" when no payments', async () => {
        const mockSalesData = [
            {
                _id: '5',
                fullName: 'No Payment Product',
                date: '2025-10-05',
                sellingPoint: 'Test Point',
                size: 'M',
                barcode: '444555666',
                timestamp: '2025-10-05T14:00:00Z',
                cash: [],
                card: []
            }
        ];

        mockedAxios.get.mockResolvedValue({ data: mockSalesData });

        render(<Sales />);

        await waitFor(() => {
            expect(screen.getByText('Brak płatności')).toBeInTheDocument();
        });
    });

    test('should handle missing cash and card arrays', async () => {
        const mockSalesData = [
            {
                _id: '6',
                fullName: 'Missing Arrays Product',
                date: '2025-10-05',
                sellingPoint: 'Test Point',
                size: 'L',
                barcode: '777888999',
                timestamp: '2025-10-05T15:00:00Z'
                // cash and card properties are missing
            }
        ];

        mockedAxios.get.mockResolvedValue({ data: mockSalesData });

        render(<Sales />);

        await waitFor(() => {
            expect(screen.getByText('Brak płatności')).toBeInTheDocument();
        });
    });

    test('should ignore zero payments', async () => {
        const mockSalesData = [
            {
                _id: '7',
                fullName: 'Zero Payment Product',
                date: '2025-10-05',
                sellingPoint: 'Test Point',
                size: 'XS',
                barcode: '000111222',
                timestamp: '2025-10-05T16:00:00Z',
                cash: [
                    { price: 0, currency: 'PLN' }
                ],
                card: [
                    { price: 0, currency: 'PLN' }
                ]
            }
        ];

        mockedAxios.get.mockResolvedValue({ data: mockSalesData });

        render(<Sales />);

        await waitFor(() => {
            expect(screen.getByText('Brak płatności')).toBeInTheDocument();
        });
    });

    test('should handle different currencies', async () => {
        const mockSalesData = [
            {
                _id: '8',
                fullName: 'Multi Currency Product',
                date: '2025-10-05',
                sellingPoint: 'Test Point',
                size: 'M',
                barcode: '333444555',
                timestamp: '2025-10-05T17:00:00Z',
                cash: [
                    { price: 100, currency: 'EUR' }
                ],
                card: [
                    { price: 50, currency: 'USD' }
                ]
            }
        ];

        mockedAxios.get.mockResolvedValue({ data: mockSalesData });

        render(<Sales />);

        await waitFor(() => {
            expect(screen.getByText('100 EUR (Gotówka)')).toBeInTheDocument();
            expect(screen.getByText('50 USD (Karta)')).toBeInTheDocument();
        });
    });

    test('should handle API error gracefully', async () => {
        mockedAxios.get.mockRejectedValue(new Error('API Error'));

        render(<Sales />);

        await waitFor(() => {
            expect(screen.getByText('Failed to fetch sales data. Please try again later.')).toBeInTheDocument();
        });
    });

    test('should handle non-array API response', async () => {
        mockedAxios.get.mockResolvedValue({ data: 'invalid response' });

        render(<Sales />);

        await waitFor(() => {
            expect(screen.getByText('Brak danych sprzedaży')).toBeInTheDocument();
        });
    });
});