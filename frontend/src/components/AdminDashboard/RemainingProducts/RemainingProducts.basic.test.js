import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RemainingProducts from './RemainingProducts';

// Helper function to render component with router
const renderWithRouter = (component) => {
    return render(
        <BrowserRouter>
            {component}
        </BrowserRouter>
    );
};

describe('RemainingProducts Component - Basic Tests', () => {
    test('renders without crashing', () => {
        renderWithRouter(<RemainingProducts />);
    });

    test('displays correct title', () => {
        renderWithRouter(<RemainingProducts />);
        
        const title = screen.getByText('Tabela pozostałego asortymentu');
        expect(title).toBeInTheDocument();
    });

    test('displays construction message', () => {
        renderWithRouter(<RemainingProducts />);
        
        const message = screen.getByText(/Komponent w budowie/i);
        expect(message).toBeInTheDocument();
    });

    test('component contains both expected texts', () => {
        renderWithRouter(<RemainingProducts />);
        
        // Check if both title and message are present
        expect(screen.getByText('Tabela pozostałego asortymentu')).toBeInTheDocument();
        expect(screen.getByText(/Komponent w budowie/i)).toBeInTheDocument();
    });

    test('components have different titles', () => {
        // This test ensures that main and subcategory components are different
        renderWithRouter(<RemainingProducts />);
        
        // Should have main title, not subcategory title
        expect(screen.getByText('Tabela pozostałego asortymentu')).toBeInTheDocument();
        expect(screen.queryByText('Podkategorie - Pozostały asortyment')).not.toBeInTheDocument();
    });
});