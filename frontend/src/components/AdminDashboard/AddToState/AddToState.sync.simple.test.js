import React from 'react';
import { render, screen } from '@testing-library/react';
import AddToState from './AddToState';

// Mock fetch dla API
global.fetch = jest.fn(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([])
  })
);

describe('AddToState - Sync Simple Test', () => {
  test('renders without crashing', () => {
    render(<AddToState />);
    expect(screen.getByText('📦 Magazyn')).toBeInTheDocument();
  });
});
