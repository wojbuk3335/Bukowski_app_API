import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Routes, Route } from 'react-router-dom';
import RemainingProducts from './RemainingProducts';
import RemainingProductsSubcategory from './RemainingProductsSubcategory';

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
    test('renders RemainingProducts component on /remaining-products route', () => {
        render(
            <MemoryRouter initialEntries={['/remaining-products']}>
                <MockAdminDashboard />
            </MemoryRouter>
        );

        expect(screen.getByText('Tabela pozostałego asortymentu')).toBeInTheDocument();
        expect(screen.getByText(/Komponent w budowie/i)).toBeInTheDocument();
    });

    test('renders RemainingProductsSubcategory component on /category/remaining route', () => {
        render(
            <MemoryRouter initialEntries={['/category/remaining']}>
                <MockAdminDashboard />
            </MemoryRouter>
        );

        expect(screen.getByText('Podkategorie - Pozostały asortyment')).toBeInTheDocument();
        expect(screen.getByText(/Komponent podkategorii pozostałego asortymentu jest w trakcie budowy/i)).toBeInTheDocument();
    });

    test('different components render on different routes', () => {
        const { unmount: unmount1 } = render(
            <MemoryRouter initialEntries={['/remaining-products']}>
                <MockAdminDashboard />
            </MemoryRouter>
        );

        // First route - main component
        expect(screen.getByText('Tabela pozostałego asortymentu')).toBeInTheDocument();
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
        expect(screen.queryByText('Tabela pozostałego asortymentu')).not.toBeInTheDocument();
    });

    test('components have different content and purpose', () => {
        // Test main component
        const { unmount: unmount1 } = render(
            <MemoryRouter initialEntries={['/remaining-products']}>
                <MockAdminDashboard />
            </MemoryRouter>
        );

        const mainComponentMessage = screen.getByText(/Komponent w budowie/i);
        expect(mainComponentMessage).toBeInTheDocument();
        
        // Store the text content for comparison
        const mainText = mainComponentMessage.textContent;
        
        // Cleanup first render
        unmount1();

        // Test subcategory component
        render(
            <MemoryRouter initialEntries={['/category/remaining']}>
                <MockAdminDashboard />
            </MemoryRouter>
        );

        const subcategoryMessage = screen.getByText(/Komponent podkategorii pozostałego asortymentu jest w trakcie budowy/i);
        expect(subcategoryMessage).toBeInTheDocument();

        // Verify they have different messages
        expect(mainText).not.toBe(subcategoryMessage.textContent);
    });
});