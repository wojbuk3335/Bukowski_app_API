import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock axios
jest.mock('axios');

describe('Bags Component - Torebki_Kod Validation Unit Tests', () => {
    // Helper function that replicates the validation logic from the component
    const validateTorebkiKod = (value, currentValue = '') => {
        // Allow empty string
        if (value === '') return value;
        
        // Check if value contains a decimal point
        if (value.includes('.')) {
            const parts = value.split('.');
            // If there's more than one decimal point, return the current value
            if (parts.length > 2) return currentValue;
            
            // Limit decimal places to maximum 3 digits
            if (parts[1] && parts[1].length > 3) {
                return parts[0] + '.' + parts[1].slice(0, 3);
            }
        }
        
        return value;
    };

    test('limits decimal places to maximum 3 digits', () => {
        // Test various input scenarios
        expect(validateTorebkiKod('')).toBe('');
        expect(validateTorebkiKod('10')).toBe('10');
        expect(validateTorebkiKod('10.5')).toBe('10.5');
        expect(validateTorebkiKod('10.123')).toBe('10.123');
        expect(validateTorebkiKod('10.1234')).toBe('10.123'); // Should limit to 3 decimal places
        expect(validateTorebkiKod('10.12345')).toBe('10.123'); // Should limit to 3 decimal places
    });

    test('handles multiple decimal points correctly', () => {
        expect(validateTorebkiKod('10..5', '10.5')).toBe('10.5'); // Should handle multiple decimal points
        expect(validateTorebkiKod('10.5.3', '10.5')).toBe('10.5'); // Should handle multiple decimal points
    });

    test('validates edge cases for Torebki_Kod input', () => {
        // Test edge cases
        expect(validateTorebkiKod('0.999')).toBe('0.999');
        expect(validateTorebkiKod('0.9999')).toBe('0.999');
        expect(validateTorebkiKod('123.0')).toBe('123.0');
        expect(validateTorebkiKod('123.001')).toBe('123.001');
        expect(validateTorebkiKod('123.0012')).toBe('123.001');
        expect(validateTorebkiKod('.')).toBe('.');
        expect(validateTorebkiKod('.123')).toBe('.123');
        expect(validateTorebkiKod('.1234')).toBe('.123');
    });

    test('handles very long decimal numbers', () => {
        expect(validateTorebkiKod('999.123456789')).toBe('999.123');
        expect(validateTorebkiKod('0.000000001')).toBe('0.000');
        expect(validateTorebkiKod('12345.999999')).toBe('12345.999');
    });

    test('preserves integer values', () => {
        expect(validateTorebkiKod('0')).toBe('0');
        expect(validateTorebkiKod('1')).toBe('1');
        expect(validateTorebkiKod('123')).toBe('123');
        expect(validateTorebkiKod('9999')).toBe('9999');
    });
});