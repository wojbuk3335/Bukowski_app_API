const express = require('express');
const router = express.Router();
const {
    getTransactionHistory,
    saveTransaction,
    updateTransaction,
    deactivateTransaction,
    getTransactionById,
    clearOldTransactions
} = require('../controllers/transactionHistory');
const checkAuth = require('../middleware/check-auth'); // 🔒 HISTORIA TRANSAKCJI - NAJWYŻSZY POZIOM ZABEZPIECZEŃ

// ========== WSZYSTKO WYMAGAJĄCE AUTORYZACJI - DANE FINANSOWE ==========
router.get('/', checkAuth, getTransactionHistory); // 🔒 Historia transakcji - WRAŻLIWE DANE
router.post('/', checkAuth, saveTransaction); // 🔒 Zapisywanie transakcji
router.get('/:transactionId', checkAuth, getTransactionById); // 🔒 Konkretna transakcja
router.put('/:transactionId', checkAuth, updateTransaction); // 🔒 Aktualizacja transakcji
router.delete('/:transactionId', checkAuth, deactivateTransaction); // 🔒 Dezaktywacja transakcji
router.post('/clear-old', checkAuth, clearOldTransactions); // 🔒 Czyszczenie starych transakcji

module.exports = router;
