import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Routes, Route } from 'react-router-dom';
import axios from 'axios';
import RemainingProducts from './RemainingProducts';
import RemainingProductsSubcategory from './RemainingProductsSubcategory';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Mock AdminDashboard component structure for testing
const MockAdminDashboard = ({ children }) => (
    <div data-testid="admin-dashboard">
        <Routes>
            <Route path="/remaining-products" element={<RemainingProducts />} />
            <Route path="/category/remaining" element={<RemainingProductsSubcategory />} />
        </Routes>
    </div>
);

describe('RemainingProducts Routing Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Mock API responses
        mockedAxios.get.mockResolvedValue({ 
            data: { 
                remainingProducts: [],
                remainingCategories: []
            } 
        });
    });

    test('renders RemainingProducts component on /remaining-products route', async () => {
        await act(async () => {
            render(
                <MemoryRouter initialEntries={['/remaining-products']}>
                    <MockAdminDashboard />
                </MemoryRouter>
            );
        });

        await waitFor(() => {
            expect(screen.getByText('Pozostały asortyment')).toBeInTheDocument();
        });
        
        expect(screen.getByText('Dodaj nowy wiersz')).toBeInTheDocument();
        expect(screen.getByDisplayValue('10')).toBeInTheDocument();
    });

    test('renders RemainingProductsSubcategory component on /category/remaining route', () => {
        render(
            <MemoryRouter initialEntries={['/category/remaining']}>
                <MockAdminDashboard />
            </MemoryRouter>
        );

        expect(screen.getByText('Podkategorie - Pozostały asortyment')).toBeInTheDocument();
        expect(screen.getByText('Rem_Kat_1_Kod_1')).toBeInTheDocument();
    });

    test('different components render on different routes', async () => {
        let unmount1;
        await act(async () => {
            const result = render(
                <MemoryRouter initialEntries={['/remaining-products']}>
                    <MockAdminDashboard />
                </MemoryRouter>
            );
            unmount1 = result.unmount;
        });

        // First route - main component
        await waitFor(() => {
            expect(screen.getByText('Pozostały asortyment')).toBeInTheDocument();
        });
        expect(screen.queryByText('Podkategorie - Pozostały asortyment')).not.toBeInTheDocument();

        // Cleanup first render
        unmount1();

        // Second route - subcategory component
        render(
            <MemoryRouter initialEntries={['/category/remaining']}>
                <MockAdminDashboard />
            </MemoryRouter>
        );

        expect(screen.getByText('Podkategorie - Pozostały asortyment')).toBeInTheDocument();
        expect(screen.queryByText('Pozostały asortyment')).not.toBeInTheDocument();
    });

    test('components have different content and purpose', async () => {
        // Test main component
        let unmount1, mainContainer;
        await act(async () => {
            const result = render(
                <MemoryRouter initialEntries={['/remaining-products']}>
                    <MockAdminDashboard />
                </MemoryRouter>
            );
            unmount1 = result.unmount;
            mainContainer = result.container;
        });

        await waitFor(() => {
            expect(screen.getByText('Pozostały asortyment')).toBeInTheDocument();
        });
        
        // Store the text content for comparison
        const mainText = mainContainer.textContent;
        
        // Cleanup first render
        unmount1();

        // Test subcategory component
        const { container: subcategoryContainer } = render(
            <MemoryRouter initialEntries={['/category/remaining']}>
                <MockAdminDashboard />
            </MemoryRouter>
        );

        const subcategoryTitle = screen.getByText('Podkategorie - Pozostały asortyment');
        expect(subcategoryTitle).toBeInTheDocument();

        // Verify they have different content
        expect(mainText).not.toBe(subcategoryContainer.textContent);
    });
});