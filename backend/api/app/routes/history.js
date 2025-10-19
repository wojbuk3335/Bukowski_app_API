const express = require('express');
const router = express.Router();
const historyController = require('../controllers/history');
const checkAuth = require('../middleware/check-auth'); // 🔒 HISTORIA MUSI BYĆ ZABEZPIECZONA!

// ========== WSZYSTKIE OPERACJE HISTORII WYMAGAJĄ AUTORYZACJI ==========
router.get('/', checkAuth, historyController.getAllHistory); // 🔒 CAŁA HISTORIA - tylko dla zalogowanych
router.delete('/remove', checkAuth, historyController.removeAllHistory); // 🔒 BARDZO NIEBEZPIECZNE - usuń całą historię
router.delete('/by-transaction/:transactionId', checkAuth, historyController.deleteByTransactionId); // 🔒 Usuń po ID transakcji
router.post('/delete-by-details', checkAuth, historyController.deleteByTransactionDetails); // 🔒 Usuń po detalach
router.post('/delete-single-item', checkAuth, historyController.deleteSingleItem); // 🔒 Usuń pojedynczy element
router.delete('/:id', checkAuth, historyController.deleteSingleRecord); // 🔒 Usuń pojedynczy rekord

module.exports = router;
