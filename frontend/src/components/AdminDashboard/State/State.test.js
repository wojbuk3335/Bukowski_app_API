import { act } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import State from './State';
import axios from 'axios';

// Mock axios
jest.mock('axios');

beforeAll(() => {
    // Mock window.alert to prevent "Not implemented" error
    window.alert = jest.fn();
});

beforeEach(() => {
    // Mock responses for axios requests
    axios.get.mockImplementation((url) => {
        if (url === '/api/excel/goods/get-all-goods') {
            return Promise.resolve({ data: { goods: [{ fullName: 'Produkt 1' }] } });
        }
        if (url === '/api/excel/size/get-all-sizes') {
            return Promise.resolve({ data: { sizes: [{ Roz_Opis: 'Rozmiar 1' }] } });
        }
        if (url === '/api/state') {
            return Promise.resolve({
                data: [
                    {
                        id: '1',
                        fullName: 'Produkt 1',
                        Plec: 'M',
                        date: '2023-10-01',
                        size: 'Rozmiar 1',
                        barcode: '123456789',
                        symbol: 'Symbol 1',
                        price: '100 PLN',
                    },
                ],
            });
        }
        if (url === '/api/user') {
            return Promise.resolve({
                data: {
                    users: [{ _id: '1', symbol: 'Symbol 1', role: 'user' }],
                },
            });
        }
        return Promise.reject(new Error('Nieznany URL'));
    });
});

test('renders State component without crashing', async () => {
    let container;
    await act(async () => {
        container = render(<State />).container;
    });
    expect(container).toBeInTheDocument();
});

test('every row in the data table renders Edytuj and Usuń buttons', async () => {
    await act(async () => {
        render(<State />);
    });
    await waitFor(() => {
        const rows = screen.getAllByRole('row'); // Wait for rows to render
        rows.slice(1).forEach((row) => { // Skip the header row
            expect(row).toHaveTextContent('Edytuj');
            expect(row).toHaveTextContent('Usuń');
        });
    });
});

test('every row in the data table renders barcode image and selection checkbox', async () => {
    await act(async () => {
        render(<State />);
    });
    await waitFor(() => {
        const rows = screen.getAllByRole('row'); // Wait for rows to render
        rows.slice(1).forEach((row) => { // Skip the header row
            expect(row).toContainHTML('<img'); // Ensure barcode image is rendered
            expect(row).toContainHTML('<input type="checkbox"'); // Ensure checkbox is rendered
        });
    });
});
