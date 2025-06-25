import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import AddToState from './AddToState';
import axios from 'axios';

// Mock axios
jest.mock('axios');

// Mock DatePicker component to avoid potential issues with date handling
jest.mock('react-datepicker', () => {
  return {
    __esModule: true,
    default: ({ selected, onChange, className }) => (
      <input 
        data-testid="date-picker"
        type="date" 
        value={selected ? selected.toISOString().split('T')[0] : ''}
        onChange={(e) => onChange && onChange(new Date(e.target.value))}
        className={className}
      />
    ),
    registerLocale: jest.fn(),
  };
});

beforeAll(() => {
  // Mock window.alert to prevent "Not implemented" error
  window.alert = jest.fn();
  
  // Mock console methods to avoid noise in tests
  console.log = jest.fn();
  console.error = jest.fn();
});

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Mock axios responses
  axios.get.mockImplementation((url) => {
    if (url === '/api/state') {
      return Promise.resolve({
        data: [
          {
            id: '1',
            fullName: 'Test Product',
            size: 'M',
            barcode: '123456789',
            price: 100,
            symbol: 'MAGAZYN'
          }
        ]
      });
    }
    if (url === '/api/sales/get-all-sales') {
      return Promise.resolve({
        data: [
          {
            _id: '1',
            fullName: 'Test Product',
            size: 'M',
            barcode: '123456789',
            cash: [{ price: 100, currency: 'PLN' }],
            card: [],
            timestamp: new Date().toISOString(),
            sellingPoint: 'Test Point'
          }
        ]
      });
    }
    if (url === '/api/user') {
      return Promise.resolve({
        data: {
          users: [
            {
              _id: '1',
              symbol: 'TEST',
              sellingPoint: 'Test Point',
              role: 'user'
            }
          ]
        }
      });
    }
    if (url === '/api/transaction-history') {
      return Promise.resolve({
        data: []
      });
    }
    return Promise.reject(new Error('Nieznany URL'));
  });
});

test('renders AddToState component without crashing', async () => {
  let container;
  
  await act(async () => {
    const rendered = render(<AddToState />);
    container = rendered.container;
  });

  // Wait for component to finish loading
  await waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  expect(container).toBeInTheDocument();
});

test('displays "Magazyn" and operation type selection', async () => {
  await act(async () => {
    render(<AddToState />);
  });

  // Wait for component to load
  await waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  // Check if main sections are rendered
  expect(screen.getByText('Magazyn')).toBeInTheDocument();
  expect(screen.getByText('Typ operacji:')).toBeInTheDocument();
  
  // Check if operation type select is present
  const operationSelect = screen.getByDisplayValue('Sprzedaż');
  expect(operationSelect).toBeInTheDocument();
});
