const historyLogger = require('./historyLogger');
const History = require('../db/models/history');
const Stock = require('../db/models/stock');
const Goods = require('../db/models/goods');
const State = require('../db/models/state');
const User = require('../db/models/user');
const Size = require('../db/models/size');
const Category = require('../db/models/category');

jest.mock('../db/models/history');
jest.mock('../db/models/stock');
jest.mock('../db/models/goods');
jest.mock('../db/models/state');
jest.mock('../db/models/user');
jest.mock('../db/models/size');
jest.mock('../db/models/category');

describe('Simple test', () => {
    test('should always pass', () => {
        expect(true).toBe(true);
    });
});

describe('historyLogger middleware - State updates', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            method: 'PUT',
            params: { id: 'state123' },
            body: { sellingPoint: 'New Symbol' },
            user: { _id: 'user123' },
        };
        res = {};
        next = jest.fn();

        // Mock State.findById with populate
        State.findById.mockImplementation(() => ({
            populate: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue({
                sellingPoint: { symbol: 'Old Symbol' },
                fullName: { fullName: 'Product Name' },
                size: { Roz_Opis: 'Size Name' }, // Include size in the mock
            }),
        }));

        // Mock History.save
        History.mockImplementation(function () {
            return {
                save: jest.fn().mockResolvedValue(true),
            };
        });

        History.mockClear();
    });

    test('should create a history entry with correct "from" and "to" when symbol is updated', async () => {
        const middleware = historyLogger('states');

        await middleware(req, res, next);

        expect(History).toHaveBeenCalledWith({
            collectionName: 'Stan',
            operation: 'Aktualizacja',
            product: 'Product Name Size Name', // Ensure size is included in product
            details: 'Punkt sprzedaży został zmieniony z Old Symbol na New Symbol',
            userloggedinId: 'user123',
            from: 'Old Symbol',
            to: 'New Symbol',
        });
        expect(next).toHaveBeenCalled();
    });
});

describe('historyLogger middleware - Goods collection', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            method: 'POST',
            params: {},
            body: { fullName: 'New Product' },
            user: { _id: 'user123' },
        };
        res = {};
        next = jest.fn();

        // Mock Goods.findById
        Goods.findById.mockImplementation(() => ({
            populate: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue({
                fullName: 'Old Product',
                stock: { Tow_Opis: 'Old Stock' },
                color: { Kol_Opis: 'Old Color' },
                subcategory: { Kat_1_Opis_1: 'Old Subcategory' },
                price: 100,
                discount_price: 80,
            }),
        }));

        // Mock History.save
        History.mockImplementation(function () {
            return {
                save: jest.fn().mockResolvedValue(true),
            };
        });

        History.mockClear();
    });

    test('should create a history entry for POST operation on goods', async () => {
        const middleware = historyLogger('goods');

        await middleware(req, res, next);

        expect(History).toHaveBeenCalledWith({
            collectionName: 'Produkty',
            operation: 'Dodano produkt',
            product: 'New Product',
            details: 'New Product',
            userloggedinId: 'user123',
            from: '-',
            to: '-',
        });
        expect(next).toHaveBeenCalled();
    });

    test('should create a history entry for PUT operation on goods', async () => {
        req.method = 'PUT';
        req.params.goodId = 'good123';
        req.body = { fullName: 'Updated Product', price: 120, discount_price: 90 };

        const middleware = historyLogger('goods');

        await middleware(req, res, next);

        expect(History).toHaveBeenCalledWith({
            collectionName: 'Produkty',
            operation: 'Aktualizacja',
            product: 'Old Product',
            details: 'Nazwa została zmieniona z Old Product na Updated Product, Cena została zmieniona z 100 na 120, Cena promocyjna została zmieniona z 80 na 90',
            userloggedinId: 'user123',
            from: '-',
            to: '-',
        });
        expect(next).toHaveBeenCalled();
    });

    test('should create a history entry for DELETE operation on goods', async () => {
        req.method = 'DELETE';
        req.params.goodId = 'good123';

        const middleware = historyLogger('goods');

        await middleware(req, res, next);

        expect(History).toHaveBeenCalledWith({
            collectionName: 'Produkty',
            operation: 'Usunięcie',
            product: 'Old Product',
            details: 'Produkt o nazwie Old Product został usunięty.',
            userloggedinId: 'user123',
            from: '-',
            to: '-',
        });
        expect(next).toHaveBeenCalled();
    });
});
