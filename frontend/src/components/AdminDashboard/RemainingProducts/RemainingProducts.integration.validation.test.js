import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RemainingProducts from './RemainingProducts';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('RemainingProducts - Integration Tests with Poz_Kod Validation', () => {
    const mockRemainingProducts = [
        {
            _id: '1',
            Poz_Nr: '1',
            Poz_Kod: '100.123',
            fullName: 'Product 1'
        },
        {
            _id: '2', 
            Poz_Nr: '2',
            Poz_Kod: '200.456',
            fullName: 'Product 2'
        }
    ];

    beforeEach(() => {
        mockedAxios.get.mockResolvedValue({
            data: { remainingProducts: mockRemainingProducts }
        });
        mockedAxios.patch.mockResolvedValue({ data: { success: true } });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should open modal and allow valid Poz_Kod input', async () => {
        render(<RemainingProducts />);
        
        await waitFor(() => {
            expect(screen.getByText('200.456')).toBeInTheDocument();
        });

        // Click update button for first product (should be 200.456 due to sorting)
        const updateButtons = screen.getAllByText('Aktualizuj');
        fireEvent.click(updateButtons[0]);

        // Modal should be open
        await waitFor(() => {
            expect(screen.getByText('Aktualizuj Poz_Kod')).toBeInTheDocument();
        });

        // Input field should exist with the first product value (200.456)
        const input = screen.getByDisplayValue('200.456');
        expect(input).toBeInTheDocument();

        // Test valid input with 3 decimal places
        fireEvent.change(input, { target: { value: '150.789' } });
        expect(input.value).toBe('150.789');
    });

    test('should allow Poz_Kod input changes (validation accepts text and numbers)', async () => {
        render(<RemainingProducts />);
        
        await waitFor(() => {
            expect(screen.getByText('200.456')).toBeInTheDocument();
        });

        // Click update button for first product
        const updateButtons = screen.getAllByText('Aktualizuj');
        fireEvent.click(updateButtons[0]);

        // Modal should be open
        await waitFor(() => {
            expect(screen.getByText('Aktualizuj Poz_Kod')).toBeInTheDocument();
        });

        const input = screen.getByDisplayValue('200.456');
        
        // Try to input value with 4 decimal places - should be allowed
        fireEvent.change(input, { target: { value: '150.7890' } });
        
        // Value should change as validation allows text and numbers
        expect(input.value).toBe('150.7890');
    });

    test('should allow valid Poz_Kod changes during real-time validation', async () => {
        render(<RemainingProducts />);
        
        await waitFor(() => {
            expect(screen.getByText('200.456')).toBeInTheDocument();
        });

        const updateButtons = screen.getAllByText('Aktualizuj');
        fireEvent.click(updateButtons[0]);

        await waitFor(() => {
            expect(screen.getByText('Aktualizuj Poz_Kod')).toBeInTheDocument();
        });

        const input = screen.getByDisplayValue('200.456');
        
        // Test various valid inputs
        fireEvent.change(input, { target: { value: '200' } });
        expect(input.value).toBe('200');
        
        fireEvent.change(input, { target: { value: '200.5' } });
        expect(input.value).toBe('200.5');
        
        fireEvent.change(input, { target: { value: '200.56' } });
        expect(input.value).toBe('200.56');
        
        fireEvent.change(input, { target: { value: '200.567' } });
        expect(input.value).toBe('200.567');
    });

    test('should accept multiple different input formats', async () => {
        render(<RemainingProducts />);
        
        await waitFor(() => {
            expect(screen.getByText('200.456')).toBeInTheDocument();
        });

        const updateButtons = screen.getAllByText('Aktualizuj');
        fireEvent.click(updateButtons[0]);

        await waitFor(() => {
            expect(screen.getByText('Aktualizuj Poz_Kod')).toBeInTheDocument();
        });

        const input = screen.getByDisplayValue('200.456');
        const originalValue = input.value;
        
        // Try multiple inputs - all should be allowed as validation allows text and numbers
        fireEvent.change(input, { target: { value: '200.1234' } }); // 4 decimal places
        expect(input.value).toBe('200.1234');
        
        fireEvent.change(input, { target: { value: '200.12345' } }); // 5 decimal places
        expect(input.value).toBe('200.12345');
        
        fireEvent.change(input, { target: { value: 'invalid' } }); // Text
        expect(input.value).toBe('invalid');
    });

    test('should allow empty value during editing', async () => {
        render(<RemainingProducts />);
        
        await waitFor(() => {
            expect(screen.getByText('200.456')).toBeInTheDocument();
        });

        const updateButtons = screen.getAllByText('Aktualizuj');
        fireEvent.click(updateButtons[0]);

        await waitFor(() => {
            expect(screen.getByText('Aktualizuj Poz_Kod')).toBeInTheDocument();
        });

        const input = screen.getByDisplayValue('200.456');
        
        // Clear the input (empty value should be allowed)
        fireEvent.change(input, { target: { value: '' } });
        expect(input.value).toBe('');
        
        // Then add a valid value
        fireEvent.change(input, { target: { value: '300.111' } });
        expect(input.value).toBe('300.111');
    });
});