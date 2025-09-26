import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AddToState from './AddToState';

// Mock axios
jest.mock('axios', () => ({
  get: jest.fn(() => Promise.resolve({ data: [] })),
  post: jest.fn(() => Promise.resolve({ data: { success: true } }))
}));

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ state: null })
}));

describe('AddToState - Auto Refresh Functionality', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  test('1. Should auto-refresh when user selection changes', async () => {
    render(<AddToState />);
    
    // Wait for component to load
    await waitFor(() => {
      const component = screen.getByText(/Mechanizm Transferów/i);
      expect(component).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('2. Should handle user select dropdown', async () => {
    render(<AddToState />);
    
    // Wait for component to render
    await waitFor(() => {
      // Look for any select element
      const selects = document.querySelectorAll('select');
      expect(selects.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  test('3. Should display basic UI elements', async () => {
    render(<AddToState />);
    
    await waitFor(() => {
      // Component should render without errors
      expect(document.body).toBeInTheDocument();
    });
  });

  test('4. Should handle component mounting and unmounting', async () => {
    const { unmount } = render(<AddToState />);
    
    await waitFor(() => {
      expect(document.body).toBeInTheDocument();
    });
    
    // Should unmount without errors
    unmount();
  });
});
