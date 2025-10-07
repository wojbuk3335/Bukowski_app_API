import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import RemainingProducts from './RemainingProducts';
import RemainingProductsSubcategory from './RemainingProductsSubcategory';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('RemainingProducts Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Mock API responses
        mockedAxios.get.mockResolvedValue({ data: { remainingProducts: [] } });
    });

    test('both components can be rendered in a routing context', async () => {
        const TestApp = () => (
            <Routes>
                <Route path="/main" element={<RemainingProducts />} />
                <Route path="/subcategory" element={<RemainingProductsSubcategory />} />
            </Routes>
        );

        // Test main component route
        await act(async () => {
            render(
                <MemoryRouter initialEntries={['/main']}>
                    <TestApp />
                </MemoryRouter>
            );
        });

        await waitFor(() => {
            expect(screen.getByText('Pozostały asortyment')).toBeInTheDocument();
        });
        expect(screen.queryByText('Podkategorie - Pozostały asortyment')).not.toBeInTheDocument();
    });

    test('subcategory component renders correctly in routing context', () => {
        const TestApp = () => (
            <Routes>
                <Route path="/main" element={<RemainingProducts />} />
                <Route path="/subcategory" element={<RemainingProductsSubcategory />} />
            </Routes>
        );

        // Test subcategory component route
        render(
            <MemoryRouter initialEntries={['/subcategory']}>
                <TestApp />
            </MemoryRouter>
        );

        expect(screen.getByText('Podkategorie - Pozostały asortyment')).toBeInTheDocument();
        expect(screen.queryByText('Pozostały asortyment')).not.toBeInTheDocument();
    });

    test('components have different content and purpose', async () => {
        // Render main component
        let mainContainer;
        await act(async () => {
            const result = render(
                <MemoryRouter>
                    <RemainingProducts />
                </MemoryRouter>
            );
            mainContainer = result.container;
        });

        // Render subcategory component
        const { container: subcategoryContainer } = render(
            <MemoryRouter>
                <RemainingProductsSubcategory />
            </MemoryRouter>
        );

        // Wait for main component to load
        await waitFor(() => {
            expect(mainContainer.textContent).toContain('Pozostały asortyment');
        });

        expect(subcategoryContainer.textContent).toContain('Podkategorie - Pozostały asortyment');
        expect(subcategoryContainer.textContent).toContain('Komponent podkategorii pozostałego asortymentu jest w trakcie budowy');

        // Verify they are actually different
        expect(mainContainer.textContent).not.toBe(subcategoryContainer.textContent);
    });

    test('components can coexist in the same application context', async () => {
        const TestApp = () => (
            <div>
                <div data-testid="main-section">
                    <RemainingProducts />
                </div>
                <div data-testid="subcategory-section">
                    <RemainingProductsSubcategory />
                </div>
            </div>
        );

        await act(async () => {
            render(
                <MemoryRouter>
                    <TestApp />
                </MemoryRouter>
            );
        });

        // Both components should be present
        const mainSection = screen.getByTestId('main-section');
        const subcategorySection = screen.getByTestId('subcategory-section');

        await waitFor(() => {
            expect(mainSection).toHaveTextContent('Pozostały asortyment');
        });
        expect(subcategorySection).toHaveTextContent('Podkategorie - Pozostały asortyment');
    });

    test('verify component exports are working correctly', () => {
        // This test ensures components can be imported and instantiated
        expect(RemainingProducts).toBeDefined();
        expect(typeof RemainingProducts).toBe('function');
        
        expect(RemainingProductsSubcategory).toBeDefined();
        expect(typeof RemainingProductsSubcategory).toBe('function');
    });
});