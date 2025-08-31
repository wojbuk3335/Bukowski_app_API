import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AddToState from '../AddToState';

// Mock fetch
global.fetch = jest.fn();

describe('Yellow Transfer Products Basic Test', () => {
  beforeEach(() => {
    fetch.mockClear();
    jest.clearAllMocks();
  });

  test('should display yellow color for incoming transfer products', async () => {
    // Mock API responses
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            _id: 't1',
            transfer_from: 'Punkt A',
            transfer_to: 'Wybrany User',
            fullName: 'Test Product',
            size: 'M',
            barcode: '123456',
            price: 100,
            date: '2024-01-01'
          }
        ]
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => []
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => []
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => []
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

    render(<AddToState />);

    // Wait for component to load
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    // Select user to trigger yellow transfers display
    const userSelect = screen.getByRole('combobox');
    fireEvent.change(userSelect, { target: { value: 'Wybrany User' } });

    // Trigger synchronization to process transfers
    const syncButton = screen.getByText(/synchronizuj/i);
    fireEvent.click(syncButton);

    await waitFor(() => {
      // Look for the yellow transfer item in the DOM
      const yellowItem = screen.getByText('Test Product');
      expect(yellowItem).toBeInTheDocument();
      
      // Check if parent element has yellow background (incoming transfer)
      const productRow = yellowItem.closest('tr');
      if (productRow) {
        const style = window.getComputedStyle(productRow);
        // Yellow color should be #ffc107
        expect(style.backgroundColor).toContain('255, 193, 7');
      }
    }, { timeout: 3000 });
  });

  test('should show color legend with yellow for incoming transfers', async () => {
    // Mock empty responses for quick render
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => [] });

    render(<AddToState />);

    await waitFor(() => {
      // Check if color legend contains yellow information
      expect(screen.getByText(/Żółty - produkty przychodzące/i)).toBeInTheDocument();
    });
  });
});
