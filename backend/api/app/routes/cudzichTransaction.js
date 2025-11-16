const express = require('express');
const router = express.Router();
const checkAuth = require('../middleware/check-auth');
const cudzichTransactionController = require('../controllers/cudzichTransaction');

// ========== CUDZICH TRANSACTION ROUTES ==========
// System zarządzania transakcjami z Tomaszem Cudzich

// Test route - sprawdź czy API działa
router.get('/test', (req, res) => {
    res.status(200).json({ 
        message: 'Cudzich Transactions API is working!',
        timestamp: new Date().toISOString()
    });
});

// ===== GŁÓWNE OPERACJE =====

// Pobierz wszystkie transakcje Cudzich
router.get('/transactions', checkAuth, cudzichTransactionController.getCudzichTransactions);
// Query params: ?recipientId=cudzich&userSymbol=P&startDate=2025-11-01&endDate=2025-11-30&type=odbior

// Pobierz aktualne saldo Cudzich
router.get('/balance', checkAuth, cudzichTransactionController.getCudzichBalance);
// Query params: ?recipientId=cudzich&userSymbol=P

// Utwórz nową transakcję (odbiór lub zwrot)
router.post('/transactions', checkAuth, cudzichTransactionController.createCudzichTransaction);
// Body: { type: 'odbior', productId, productName, size, price, notes? }

// Usuń transakcję
router.delete('/transactions/:transactionId', checkAuth, cudzichTransactionController.deleteCudzichTransaction);
// Query params: ?userSymbol=P&recipientId=cudzich

// ===== POMOCNICZE ENDPOINTY =====

// Pobierz cennik Cudzych (produkty z cenami)
router.get('/pricelist', checkAuth, cudzichTransactionController.getCudzichPriceList);

// Pobierz statystyki miesięczne/roczne
router.get('/stats', checkAuth, cudzichTransactionController.getCudzichStats);
// Query params: ?recipientId=cudzich&userSymbol=P&year=2025&month=11

// ===== SKRÓTY DLA WYGODY =====

// Szybki odbiór - Tomek zabiera kurtkę
router.post('/odbior', checkAuth, (req, res, next) => {
    req.body.type = 'odbior';
    cudzichTransactionController.createCudzichTransaction(req, res, next);
});

// Szybki zwrot - Tomek oddaje kurtkę
router.post('/zwrot', checkAuth, (req, res, next) => {
    req.body.type = 'zwrot';
    cudzichTransactionController.createCudzichTransaction(req, res, next);
});

// Pobierz tylko odbiory
router.get('/odbior', checkAuth, (req, res, next) => {
    req.query.type = 'odbior';
    cudzichTransactionController.getCudzichTransactions(req, res, next);
});

// Pobierz tylko zwroty
router.get('/zwrot', checkAuth, (req, res, next) => {
    req.query.type = 'zwrot';
    cudzichTransactionController.getCudzichTransactions(req, res, next);
});

module.exports = router;