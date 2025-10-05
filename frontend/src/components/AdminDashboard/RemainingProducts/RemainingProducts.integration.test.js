import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RemainingProducts from './RemainingProducts';
import RemainingProductsSubcategory from './RemainingProductsSubcategory';

describe('RemainingProducts Integration Tests', () => {
    test('both components can be rendered in a routing context', () => {
        const TestApp = () => (
            <Routes>
                <Route path="/main" element={<RemainingProducts />} />
                <Route path="/subcategory" element={<RemainingProductsSubcategory />} />
            </Routes>
        );

        // Test main component route
        render(
            <MemoryRouter initialEntries={['/main']}>
                <TestApp />
            </MemoryRouter>
        );

        expect(screen.getByText('Tabela pozostałego asortymentu')).toBeInTheDocument();
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
        expect(screen.queryByText('Tabela pozostałego asortymentu')).not.toBeInTheDocument();
    });

    test('components have different content and purpose', () => {
        // Render main component
        const { container: mainContainer } = render(
            <MemoryRouter>
                <RemainingProducts />
            </MemoryRouter>
        );

        // Render subcategory component
        const { container: subcategoryContainer } = render(
            <MemoryRouter>
                <RemainingProductsSubcategory />
            </MemoryRouter>
        );

        // Verify they have different content
        expect(mainContainer.textContent).toContain('Tabela pozostałego asortymentu');
        expect(mainContainer.textContent).toContain('Komponent w budowie...');

        expect(subcategoryContainer.textContent).toContain('Podkategorie - Pozostały asortyment');
        expect(subcategoryContainer.textContent).toContain('Komponent podkategorii pozostałego asortymentu jest w trakcie budowy');

        // Verify they are actually different
        expect(mainContainer.textContent).not.toBe(subcategoryContainer.textContent);
    });

    test('components can coexist in the same application context', () => {
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

        render(
            <MemoryRouter>
                <TestApp />
            </MemoryRouter>
        );

        // Both components should be present
        const mainSection = screen.getByTestId('main-section');
        const subcategorySection = screen.getByTestId('subcategory-section');

        expect(mainSection).toHaveTextContent('Tabela pozostałego asortymentu');
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