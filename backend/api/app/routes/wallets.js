const express = require('express');
const router = express.Router();
const walletsController = require('../controllers/wallets');
const historyLogger = require('../middleware/historyLogger');
const checkAuth = require('../middleware/check-auth'); // 🔒 PORTFELE - ZABEZPIECZENIE PRODUKTÓW

// ========== WSZYSTKIE OPERACJE NA PORTFELACH WYMAGAJĄ AUTORYZACJI ==========
router.get('/get-all-wallets', checkAuth, walletsController.getAllWallets); // 🔒 Lista wszystkich portfeli
router.post('/insert-wallets', checkAuth, walletsController.insertManyWallets); // 🔒 Masowe dodawanie portfeli
router.post('/update-many-wallets', checkAuth, walletsController.updateManyWallets); // 🔒 Masowa aktualizacja portfeli
router.patch('/update-wallets/:id', checkAuth, walletsController.updateWallets); // 🔒 Aktualizacja pojedynczego portfela
router.delete('/delete-wallets/:id', checkAuth, historyLogger('wallets'), walletsController.deleteWallets); // 🔒 Usuwanie pojedynczego portfela
router.delete('/delete-all-wallets', checkAuth, historyLogger('wallets'), walletsController.deleteAllWallets); // 🔒 NIEBEZPIECZNE: Usuń wszystkie portfele

module.exports = router;