import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RemainingProductsSubcategory from './RemainingProductsSubcategory';

// Mock axios
jest.mock('axios', () => ({
    get: jest.fn(() => Promise.resolve({ data: { remainingCategories: [] } })),
    post: jest.fn(() => Promise.resolve({ status: 201 })),
    patch: jest.fn(() => Promise.resolve({ status: 200 }))
}));

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
        
        const title = screen.getByText('Podkategorie - Pozostały asortyment');
        expect(title).toBeInTheDocument();
    });

    test('displays add new row button', () => {
        renderWithRouter(<RemainingProductsSubcategory />);
        
        const addButton = screen.getByText('Dodaj nowy wiersz');
        expect(addButton).toBeInTheDocument();
    });

    test('displays table with correct headers', () => {
        renderWithRouter(<RemainingProductsSubcategory />);
        
        expect(screen.getByText('Rem_Kat_1_Kod_1')).toBeInTheDocument();
        expect(screen.getByText('Rem_Kat_1_Opis_1')).toBeInTheDocument();
        expect(screen.getByText('Rodzaj')).toBeInTheDocument();
        expect(screen.getByText('Akcje')).toBeInTheDocument();
    });

    test('title has correct color styling', () => {
        renderWithRouter(<RemainingProductsSubcategory />);

        const title = screen.getByRole('heading', { level: 2 });
        expect(title).toHaveStyle({
            color: 'white'
        });
    });

    test('component structure is correct', () => {
        renderWithRouter(<RemainingProductsSubcategory />);
        
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();
    });
});