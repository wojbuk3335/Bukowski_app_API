import React from 'react';
import renderer from 'react-test-renderer';
import axios from 'axios';
import Sales from './Sales';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Mock all external dependencies
jest.mock('react-datepicker', () => {
    const mockReact = require('react');
    return {
        __esModule: true,
        default: function MockDatePicker(props) {
            return mockReact.createElement('input', {
                'data-testid': 'mock-datepicker',
                type: 'date',
                placeholder: props.placeholderText
            });
        },
        registerLocale: jest.fn()
    };
});

jest.mock('react-csv', () => ({
    CSVLink: ({ children, ...props }) => {
        const mockReact = require('react');
        return mockReact.createElement('button', { 'data-testid': 'csv-link', ...props }, children);
    }
}));

jest.mock('jspdf', () => {
    return jest.fn().mockImplementation(() => ({
        text: jest.fn(),
        addPage: jest.fn(),
        save: jest.fn()
    }));
});

jest.mock('jspdf-autotable', () => ({
    __esModule: true,
    default: jest.fn()
}));

jest.mock('xlsx', () => ({
    utils: {
        json_to_sheet: jest.fn(),
        book_new: jest.fn(),
        book_append_sheet: jest.fn()
    },
    writeFile: jest.fn()
}));

describe('Sales Component Snapshots', () => {
    beforeEach(() => {
        mockedAxios.get.mockClear();
    });

    test('should match snapshot with payment data', () => {
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
                fullName: 'Test Product',
                date: '2025-10-04',
                sellingPoint: 'Store A',
                size: 'M',
                barcode: '1234567890',
                timestamp: '2025-10-04T10:00:00Z',
                cash: [{ price: 100, currency: 'PLN' }],
                card: [{ price: 50, currency: 'PLN' }]
            }
        ];

        mockedAxios.get.mockResolvedValue({ data: mockSalesData });

        const tree = renderer.create(<Sales />).toJSON();
        expect(tree).toMatchSnapshot();
    });

    test('should match snapshot with no payment data', () => {
        const mockSalesData = [
            {
                _id: '3',
                fullName: 'No Payment Item',
                date: '2025-10-05',
                sellingPoint: 'Store B',
                size: 'L',
                barcode: '9876543210',
                timestamp: '2025-10-05T12:00:00Z',
                cash: [],
                card: []
            }
        ];

        mockedAxios.get.mockResolvedValue({ data: mockSalesData });

        const tree = renderer.create(<Sales />).toJSON();
        expect(tree).toMatchSnapshot();
    });

    test('should match snapshot with empty sales data', () => {
        mockedAxios.get.mockResolvedValue({ data: [] });

        const tree = renderer.create(<Sales />).toJSON();
        expect(tree).toMatchSnapshot();
    });

    test('should match snapshot with error state', () => {
        mockedAxios.get.mockRejectedValue(new Error('API Error'));

        const tree = renderer.create(<Sales />).toJSON();
        expect(tree).toMatchSnapshot();
    });

    test('should match snapshot with multi-currency payments', () => {
        const mockSalesData = [
            {
                _id: '4',
                fullName: 'Multi Currency Item',
                date: '2025-10-05',
                sellingPoint: 'International Store',
                size: 'XL',
                barcode: '5555666677',
                timestamp: '2025-10-05T14:00:00Z',
                cash: [
                    { price: 100, currency: 'EUR' },
                    { price: 50, currency: 'USD' }
                ],
                card: [
                    { price: 25, currency: 'GBP' }
                ]
            }
        ];

        mockedAxios.get.mockResolvedValue({ data: mockSalesData });

        const tree = renderer.create(<Sales />).toJSON();
        expect(tree).toMatchSnapshot();
    });
});