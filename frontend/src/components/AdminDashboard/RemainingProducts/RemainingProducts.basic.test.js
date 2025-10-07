import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import RemainingProducts from './RemainingProducts';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Helper function to render component with router
const renderWithRouter = (component) => {
    return render(
        <BrowserRouter>
            {component}
        </BrowserRouter>
    );
};

describe('RemainingProducts Component - Basic Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Mock API responses
        mockedAxios.get.mockResolvedValue({ data: { remainingProducts: [] } });
    });

    test('renders without crashing', async () => {
        await act(async () => {
            renderWithRouter(<RemainingProducts />);
        });
    });

    test('displays correct title', async () => {
        await act(async () => {
            renderWithRouter(<RemainingProducts />);
        });
        
        await waitFor(() => {
            expect(screen.getByText('Pozostały asortyment')).toBeInTheDocument();
        });
    });

    test('displays add button', async () => {
        await act(async () => {
            renderWithRouter(<RemainingProducts />);
        });
        
        await waitFor(() => {
            expect(screen.getByText('Dodaj nowy wiersz')).toBeInTheDocument();
        });
    });

    test('displays starting number input', async () => {
        await act(async () => {
            renderWithRouter(<RemainingProducts />);
        });
        
        await waitFor(() => {
            expect(screen.getByDisplayValue('10')).toBeInTheDocument();
        });
    });

    test('displays table headers', async () => {
        await act(async () => {
            renderWithRouter(<RemainingProducts />);
        });
        
        await waitFor(() => {
            expect(screen.getByText('Poz_Nr')).toBeInTheDocument();
            expect(screen.getByText('Poz_Kod')).toBeInTheDocument();
            expect(screen.getByText('Akcje')).toBeInTheDocument();
        });
    });
});