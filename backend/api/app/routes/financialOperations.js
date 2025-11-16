const express = require('express');
const router = express.Router();
const checkAuth = require('../middleware/check-auth');
const financialOperationController = require('../controllers/financialOperations');

// Test route - sprawdź czy API działa
router.get('/test', (req, res) => {
    res.status(200).json({ message: 'Financial Operations API is working!' });
});

// CRUD operations for financial operations
router.post('/', checkAuth, financialOperationController.createFinancialOperation); // 🔒🔒🔒 Utwórz operację finansową
router.get('/', checkAuth, financialOperationController.getFinancialOperations); // 🔒🔒🔒 Lista operacji finansowych
router.get('/:id', checkAuth, financialOperationController.getFinancialOperationById); // 🔒🔒🔒 Operacja według ID
router.put('/:id', checkAuth, financialOperationController.updateFinancialOperation); // 🔒🔒🔒 Aktualizuj operację
router.delete('/:id', checkAuth, financialOperationController.deleteFinancialOperation); // 🔒🔒🔒 Usuń operację
router.delete('/all', checkAuth, financialOperationController.deleteAllFinancialOperations); // 🔒🔒🔒 BARDZO NIEBEZPIECZNE - usuń wszystkie

// Additional routes
router.get('/user/:userSymbol', checkAuth, financialOperationController.getFinancialOperationsByUser); // 🔒🔒🔒 Operacje użytkownika
router.get('/type/:type', checkAuth, financialOperationController.getFinancialOperationsByType); // 🔒🔒🔒 Operacje według typu

// Search for advance payments
router.get('/search/advances', checkAuth, financialOperationController.searchAdvancePayments); // 🔒🔒🔒 Szukaj zaliczek

// Sales commission calculation
router.post('/calculate-commission', checkAuth, financialOperationController.calculateSalesCommission); // 🔒🔒🔒 Oblicz prowizję od sprzedaży

// Get commission details
router.get('/:id/commission-details', checkAuth, financialOperationController.getCommissionDetails); // 🔒🔒🔒 Szczegóły prowizji

module.exports = router;