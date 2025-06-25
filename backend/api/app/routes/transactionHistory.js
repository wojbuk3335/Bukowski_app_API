const express = require('express');
const router = express.Router();
const {
    getTransactionHistory,
    saveTransaction,
    deactivateTransaction,
    getTransactionById,
    clearOldTransactions
} = require('../controllers/transactionHistory');

// Get all active transaction history
router.get('/', getTransactionHistory);

// Save a new transaction to history
router.post('/', saveTransaction);

// Get a specific transaction by ID
router.get('/:transactionId', getTransactionById);

// Deactivate a transaction (soft delete)
router.delete('/:transactionId', deactivateTransaction);

// Clear old transactions
router.post('/clear-old', clearOldTransactions);

module.exports = router;
