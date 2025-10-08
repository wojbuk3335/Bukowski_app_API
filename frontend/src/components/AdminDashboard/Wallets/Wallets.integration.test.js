import React from 'react';
import { render, fireEvent, waitFor, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Wallets from './Wallets';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Mock window.alert
global.alert = jest.fn();

const mockWalletsData = {
    wallets: [
        { _id: '1', Portfele_Nr: 101, Portfele_Kod: '10.5' },
        { _id: '2', Portfele_Nr: 102, Portfele_Kod: '20.123' }
    ]
};

describe('Wallets Component Integration - Portfele_Kod Validation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Setup default mock responses
        mockedAxios.get.mockResolvedValue({
            data: mockWalletsData
        });
        mockedAxios.post.mockResolvedValue({ data: {} });
        mockedAxios.patch.mockResolvedValue({ data: {} });
    });

    test('renders wallets table with data', async () => {
        await act(async () => {
            render(<Wallets />);
        });
        
        await waitFor(() => {
            expect(screen.getByText('10.5')).toBeInTheDocument();
            expect(screen.getByText('20.123')).toBeInTheDocument();
        }, { timeout: 3000 });
    });

    test('shows update button for each wallet', async () => {
        await act(async () => {
            render(<Wallets />);
        });
        
        await waitFor(() => {
            const updateButtons = screen.getAllByText('Aktualizuj');
            expect(updateButtons).toHaveLength(2);
        }, { timeout: 3000 });
    });

    test('opens modal when update button is clicked', async () => {
        await act(async () => {
            render(<Wallets />);
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
            expect(screen.getByText('Aktualizuj Portfele_Kod')).toBeInTheDocument();
        }, { timeout: 3000 });
    });

    test('validates Portfele_Kod input in modal', async () => {
        await act(async () => {
            render(<Wallets />);
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
            expect(screen.getByText('Aktualizuj Portfele_Kod')).toBeInTheDocument();
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

        // Test validation - wallet-specific scenario
        await act(async () => {
            fireEvent.change(input, { target: { value: '100.9999' } });
        });

        expect(input.value).toBe('100.999');
    });

    test('validates edge cases in real component', async () => {
        await act(async () => {
            render(<Wallets />);
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
            expect(screen.getByText('Aktualizuj Portfele_Kod')).toBeInTheDocument();
        });

        const input = screen.getByRole('textbox');
        
        // Test multiple decimal points
        await act(async () => {
            fireEvent.change(input, { target: { value: '10.5' } }); // Set initial value
        });
        
        await act(async () => {
            fireEvent.change(input, { target: { value: '10..5' } });
        });

        expect(input.value).toBe('10.5'); // Should handle multiple decimal points
        
        // Test empty value
        await act(async () => {
            fireEvent.change(input, { target: { value: '' } });
        });

        expect(input.value).toBe('');
    });
});