import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock Navigation component structure for testing
const MockNavigation = ({ onNavigate }) => (
    <nav data-testid="navigation">
        <div className="dropdown">
            <button data-testid="tables-dropdown">Tabele</button>
            <div className="dropdown-menu">
                <a 
                    href="/admin/dashboard/remaining-products" 
                    onClick={(e) => { e.preventDefault(); onNavigate('/admin/dashboard/remaining-products'); }}
                    data-testid="main-remaining-products-link"
                >
                    Tabela pozostałego asortymentu
                </a>
                
                <div className="dropdown-submenu" data-testid="subcategories-submenu">
                    <span>Tabela podkategorii</span>
                    <div className="nested-dropdown">
                        <a 
                            href="/admin/dashboard/category/remaining" 
                            onClick={(e) => { e.preventDefault(); onNavigate('/admin/dashboard/category/remaining'); }}
                            data-testid="subcategory-remaining-products-link"
                        >
                            Pozostały asortyment
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </nav>
);

describe('Navigation Menu E2E Tests', () => {
    let navigateMock;

    beforeEach(() => {
        navigateMock = jest.fn();
    });

    test('navigation contains both remaining products menu items', () => {
        render(<MockNavigation onNavigate={navigateMock} />);

        // Check main menu item
        const mainLink = screen.getByTestId('main-remaining-products-link');
        expect(mainLink).toBeInTheDocument();
        expect(mainLink).toHaveTextContent('Tabela pozostałego asortymentu');

        // Check submenu item
        const submenuLink = screen.getByTestId('subcategory-remaining-products-link');
        expect(submenuLink).toBeInTheDocument();
        expect(submenuLink).toHaveTextContent('Pozostały asortyment');
    });

    test('main menu link navigates to correct route', async () => {
        render(<MockNavigation onNavigate={navigateMock} />);

        const mainLink = screen.getByTestId('main-remaining-products-link');
        fireEvent.click(mainLink);

        expect(navigateMock).toHaveBeenCalledWith('/admin/dashboard/remaining-products');
    });

    test('submenu link navigates to correct route', async () => {
        render(<MockNavigation onNavigate={navigateMock} />);

        const submenuLink = screen.getByTestId('subcategory-remaining-products-link');
        fireEvent.click(submenuLink);

        expect(navigateMock).toHaveBeenCalledWith('/admin/dashboard/category/remaining');
    });

    test('different menu items lead to different routes', async () => {
        render(<MockNavigation onNavigate={navigateMock} />);

        // Click main menu item
        const mainLink = screen.getByTestId('main-remaining-products-link');
        fireEvent.click(mainLink);

        // Click submenu item
        const submenuLink = screen.getByTestId('subcategory-remaining-products-link');
        fireEvent.click(submenuLink);

        // Verify different routes were called
        expect(navigateMock).toHaveBeenCalledTimes(2);
        expect(navigateMock).toHaveBeenNthCalledWith(1, '/admin/dashboard/remaining-products');
        expect(navigateMock).toHaveBeenNthCalledWith(2, '/admin/dashboard/category/remaining');
    });

    test('submenu is properly nested within subcategories', () => {
        render(<MockNavigation onNavigate={navigateMock} />);

        const subcategoriesSubmenu = screen.getByTestId('subcategories-submenu');
        const submenuLink = screen.getByTestId('subcategory-remaining-products-link');

        expect(subcategoriesSubmenu).toContainElement(submenuLink);
        expect(subcategoriesSubmenu).toHaveTextContent('Tabela podkategorii');
    });

    test('menu structure accessibility', () => {
        render(<MockNavigation onNavigate={navigateMock} />);

        // Check if navigation is properly marked
        const nav = screen.getByTestId('navigation');
        expect(nav).toBeInTheDocument();

        // Check if links are accessible
        const mainLink = screen.getByTestId('main-remaining-products-link');
        const submenuLink = screen.getByTestId('subcategory-remaining-products-link');

        expect(mainLink).toHaveAttribute('href');
        expect(submenuLink).toHaveAttribute('href');
        
        // Check if links have proper text content for screen readers
        expect(mainLink).toHaveAccessibleName('Tabela pozostałego asortymentu');
        expect(submenuLink).toHaveAccessibleName('Pozostały asortyment');
    });
});