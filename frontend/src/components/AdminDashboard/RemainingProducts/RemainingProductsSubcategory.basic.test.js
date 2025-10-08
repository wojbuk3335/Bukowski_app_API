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

describe('RemainingProductsSubcategory Component - Basic Tests', () => {
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

    test('displays refresh button', () => {
        renderWithRouter(<RemainingProductsSubcategory />);
        
        const refreshButton = screen.getByText('Odśwież');
        expect(refreshButton).toBeInTheDocument();
    });

    test('displays table with correct headers', () => {
        renderWithRouter(<RemainingProductsSubcategory />);
        
        expect(screen.getByText('Rem_Kat_1_Kod_1')).toBeInTheDocument();
        expect(screen.getByText('Rem_Kat_1_Opis_1')).toBeInTheDocument();
        expect(screen.getByText('Rodzaj')).toBeInTheDocument();
        expect(screen.getByText('Akcje')).toBeInTheDocument();
    });
});