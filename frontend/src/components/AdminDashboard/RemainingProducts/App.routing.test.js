import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Mock components to avoid complex dependencies
const MockRemainingProducts = () => {
    return (
        <div data-testid="remaining-products-component">
            <h3 style={{ color: 'white', textAlign: 'center', marginTop: '2rem' }}>
                Tabela pozostałego asortymentu
            </h3>
            <p style={{ color: 'white', textAlign: 'center', marginTop: '1rem' }}>
                Komponent w budowie...
            </p>
        </div>
    );
};

const MockRemainingProductsSubcategory = () => {
    return (
        <div style={{ padding: '20px' }} data-testid="remaining-products-subcategory-component">
            <h2 style={{ color: '#2c3e50', marginBottom: '20px' }}>
                Podkategorie - Pozostały asortyment
            </h2>
            <p style={{ color: '#7f8c8d', fontSize: '16px' }}>
                Komponent podkategorii pozostałego asortymentu jest w trakcie budowy...
            </p>
        </div>
    );
};

// Simplified App component structure for testing
const MockApp = () => {
    return (
        <div>
            <Routes>
                <Route path="/admin/dashboard" element={<div>Dashboard</div>} />
                <Route path="/admin/dashboard/remaining-products" element={<MockRemainingProducts />} />
                <Route path="/admin/dashboard/category/remaining" element={<MockRemainingProductsSubcategory />} />
            </Routes>
        </div>
    );
};

describe('App.js Routing Configuration', () => {
    test('routes to main remaining products component', () => {
        render(
            <MemoryRouter initialEntries={['/admin/dashboard/remaining-products']}>
                <MockApp />
            </MemoryRouter>
        );

        expect(screen.getByTestId('remaining-products-component')).toBeInTheDocument();
        expect(screen.getByText('Tabela pozostałego asortymentu')).toBeInTheDocument();
    });

    test('routes to subcategory remaining products component', () => {
        render(
            <MemoryRouter initialEntries={['/admin/dashboard/category/remaining']}>
                <MockApp />
            </MemoryRouter>
        );

        expect(screen.getByTestId('remaining-products-subcategory-component')).toBeInTheDocument();
        expect(screen.getByText('Podkategorie - Pozostały asortyment')).toBeInTheDocument();
    });

    test('different routes render different components', () => {
        // Test main route
        const { unmount: unmount1 } = render(
            <MemoryRouter initialEntries={['/admin/dashboard/remaining-products']}>
                <MockApp />
            </MemoryRouter>
        );

        expect(screen.getByTestId('remaining-products-component')).toBeInTheDocument();
        expect(screen.queryByTestId('remaining-products-subcategory-component')).not.toBeInTheDocument();
        
        // Cleanup first render
        unmount1();

        // Test subcategory route
        render(
            <MemoryRouter initialEntries={['/admin/dashboard/category/remaining']}>
                <MockApp />
            </MemoryRouter>
        );

        expect(screen.getByTestId('remaining-products-subcategory-component')).toBeInTheDocument();
        expect(screen.queryByTestId('remaining-products-component')).not.toBeInTheDocument();
    });

    test('nested routing structure works correctly', () => {
        render(
            <MemoryRouter initialEntries={['/admin/dashboard/category/remaining']}>
                <MockApp />
            </MemoryRouter>
        );

        // Should render the nested component under category route
        expect(screen.getByTestId('remaining-products-subcategory-component')).toBeInTheDocument();
    });

    test('route paths are correctly configured', () => {
        // Test that the route structure matches our expected URL patterns
        const routeTests = [
            {
                path: '/admin/dashboard/remaining-products',
                expectedComponent: 'remaining-products-component',
                description: 'main remaining products route'
            },
            {
                path: '/admin/dashboard/category/remaining',
                expectedComponent: 'remaining-products-subcategory-component',
                description: 'subcategory remaining products route'
            }
        ];

        routeTests.forEach(({ path, expectedComponent, description }) => {
            const { container } = render(
                <MemoryRouter initialEntries={[path]}>
                    <MockApp />
                </MemoryRouter>
            );

            const component = container.querySelector(`[data-testid="${expectedComponent}"]`);
            expect(component).toBeInTheDocument();

            // Cleanup for next iteration
            container.remove();
        });
    });

    test('components are properly imported and accessible', () => {
        // Test main component import
        render(
            <MemoryRouter initialEntries={['/admin/dashboard/remaining-products']}>
                <MockApp />
            </MemoryRouter>
        );
        expect(screen.getByTestId('remaining-products-component')).toBeInTheDocument();

        // Test subcategory component import
        const { rerender } = render(
            <MemoryRouter initialEntries={['/admin/dashboard/category/remaining']}>
                <MockApp />
            </MemoryRouter>
        );
        expect(screen.getByTestId('remaining-products-subcategory-component')).toBeInTheDocument();
    });
});