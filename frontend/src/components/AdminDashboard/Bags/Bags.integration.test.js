import React from 'react';
import { render, fireEvent, waitFor, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Bags from './Bags';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Mock window.alert
global.alert = jest.fn();

const mockBagsData = {
    bags: [
        { _id: '1', Torebki_Nr: 1001, Torebki_Kod: '10.5' },
        { _id: '2', Torebki_Nr: 1002, Torebki_Kod: '20.123' }
    ]
};

describe('Bags Component Integration - Torebki_Kod Validation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Setup default mock responses
        mockedAxios.get.mockResolvedValue({
            data: mockBagsData
        });
        mockedAxios.post.mockResolvedValue({ data: {} });
        mockedAxios.patch.mockResolvedValue({ data: {} });
    });

    test('renders bags table with data', async () => {
        await act(async () => {
            render(<Bags />);
        });
        
        await waitFor(() => {
            expect(screen.getByText('10.5')).toBeInTheDocument();
            expect(screen.getByText('20.123')).toBeInTheDocument();
        }, { timeout: 3000 });
    });

    test('shows update button for each bag', async () => {
        await act(async () => {
            render(<Bags />);
        });
        
        await waitFor(() => {
            const updateButtons = screen.getAllByText('Aktualizuj');
            expect(updateButtons).toHaveLength(2);
        }, { timeout: 3000 });
    });

    test('opens modal when update button is clicked', async () => {
        await act(async () => {
            render(<Bags />);
        });

        await waitFor(() => {
            const updateButtons = screen.getAllByText('Aktualizuj');
            expect(updateButtons.length).toBeGreaterThan(0);
        }, { timeout: 3000 });

        const updateButtons = screen.getAllByText('Aktualizuj');
        
        await act(async () => {
            fireEvent.click(updateButtons[0]);
        });

        await waitFor(() => {
            expect(screen.getByText('Aktualizuj Torebki_Kod')).toBeInTheDocument();
        }, { timeout: 3000 });
    });

    test('validates Torebki_Kod input in modal', async () => {
        await act(async () => {
            render(<Bags />);
        });

        await waitFor(() => {
            const updateButtons = screen.getAllByText('Aktualizuj');
            expect(updateButtons.length).toBeGreaterThan(0);
        }, { timeout: 3000 });

        const updateButtons = screen.getAllByText('Aktualizuj');
        
        await act(async () => {
            fireEvent.click(updateButtons[0]);
        });

        await waitFor(() => {
            expect(screen.getByText('Aktualizuj Torebki_Kod')).toBeInTheDocument();
        });

        // Find the input field in the modal
        const input = screen.getByRole('textbox');
        
        // Test validation - input with too many decimal places
        await act(async () => {
            fireEvent.change(input, { target: { value: '123.12345' } });
        });

        // The input should be limited to 3 decimal places
        expect(input.value).toBe('123.123');
        
        // Test validation - normal input
        await act(async () => {
            fireEvent.change(input, { target: { value: '456.78' } });
        });

        expect(input.value).toBe('456.78');
    });
});