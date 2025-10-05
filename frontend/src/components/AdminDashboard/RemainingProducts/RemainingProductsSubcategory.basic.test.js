import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RemainingProductsSubcategory from './RemainingProductsSubcategory';

// Helper function to render component with router
const renderWithRouter = (component) => {
    return render(
        <BrowserRouter>
            {component}
        </BrowserRouter>
    );
};

describe('RemainingProductsSubcategory Component - Basic Tests', () => {
    test('renders without crashing', () => {
        renderWithRouter(<RemainingProductsSubcategory />);
    });

    test('displays correct title', () => {
        renderWithRouter(<RemainingProductsSubcategory />);
        
        const title = screen.getByText('Podkategorie - Pozostały asortyment');
        expect(title).toBeInTheDocument();
    });

    test('displays construction message', () => {
        renderWithRouter(<RemainingProductsSubcategory />);
        
        const message = screen.getByText(/Komponent podkategorii pozostałego asortymentu jest w trakcie budowy/i);
        expect(message).toBeInTheDocument();
    });

    test('component contains both expected texts', () => {
        renderWithRouter(<RemainingProductsSubcategory />);
        
        // Check if both title and message are present
        expect(screen.getByText('Podkategorie - Pozostały asortyment')).toBeInTheDocument();
        expect(screen.getByText(/Komponent podkategorii pozostałego asortymentu jest w trakcie budowy/i)).toBeInTheDocument();
    });
});