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

describe('RemainingProductsSubcategory Component', () => {
    test('renders without crashing', () => {
        renderWithRouter(<RemainingProductsSubcategory />);
    });

    test('displays correct title', () => {
        renderWithRouter(<RemainingProductsSubcategory />);
        
        const title = screen.getByRole('heading', { level: 2 });
        expect(title).toBeInTheDocument();
        expect(title).toHaveTextContent('Podkategorie - Pozostały asortyment');
    });

    test('displays construction message', () => {
        renderWithRouter(<RemainingProductsSubcategory />);
        
        const message = screen.getByText(/Komponent podkategorii pozostałego asortymentu jest w trakcie budowy/i);
        expect(message).toBeInTheDocument();
    });

    test('has correct styling structure', () => {
        renderWithRouter(<RemainingProductsSubcategory />);
        
        const container = screen.getByText(/Podkategorie - Pozostały asortyment/i).closest('div');
        expect(container).toHaveStyle({
            padding: '20px'
        });
    });

    test('title has correct color styling', () => {
        renderWithRouter(<RemainingProductsSubcategory />);
        
        const title = screen.getByRole('heading', { level: 2 });
        expect(title).toHaveStyle({
            color: '#2c3e50',
            marginBottom: '20px'
        });
    });

    test('message has correct color and font size styling', () => {
        renderWithRouter(<RemainingProductsSubcategory />);
        
        const message = screen.getByText(/Komponent podkategorii pozostałego asortymentu jest w trakcie budowy/i);
        expect(message).toHaveStyle({
            color: '#7f8c8d',
            fontSize: '16px'
        });
    });

    test('component structure is correct', () => {
        renderWithRouter(<RemainingProductsSubcategory />);
        
        // Check if main container exists
        const container = screen.getByText(/Podkategorie - Pozostały asortyment/i).closest('div');
        expect(container).toBeInTheDocument();
        
        // Check if both title and message are children of the container
        const title = screen.getByRole('heading', { level: 2 });
        const message = screen.getByText(/Komponent podkategorii pozostałego asortymentu jest w trakcie budowy/i);
        
        expect(container).toContainElement(title);
        expect(container).toContainElement(message);
    });

    test('is accessible', () => {
        renderWithRouter(<RemainingProductsSubcategory />);
        
        // Check for proper heading hierarchy
        const title = screen.getByRole('heading', { level: 2 });
        expect(title).toBeInTheDocument();
        
        // Check if content is readable
        const message = screen.getByText(/Komponent podkategorii pozostałego asortymentu jest w trakcie budowy/i);
        expect(message).toBeVisible();
    });

    test('matches snapshot', () => {
        const { container } = renderWithRouter(<RemainingProductsSubcategory />);
        expect(container.firstChild).toMatchSnapshot();
    });
});