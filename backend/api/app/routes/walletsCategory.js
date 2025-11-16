const express = require('express');
const router = express.Router();
const WalletsCategoryController = require('../controllers/walletsCategory');
const historyLogger = require('../middleware/historyLogger');
const checkAuth = require('../middleware/check-auth'); // 🔒 KATEGORIE PORTFELI - OSTATNI PLIK DO ZABEZPIECZENIA!

const walletsCategoryController = new WalletsCategoryController();

// ========== WSZYSTKIE OPERACJE KATEGORII PORTFELI - ZABEZPIECZONE ==========
router.get('/get-all-wallets-categories', checkAuth, walletsCategoryController.getAllWalletsCategories); // 🔒 Lista kategorii portfeli
router.post('/insert-many-wallets-categories', checkAuth, historyLogger('walletsCategory'), walletsCategoryController.insertManyWalletsCategories); // 🔒 Masowe dodawanie kategorii
router.post('/update-many-wallets-categories', checkAuth, historyLogger('walletsCategory'), walletsCategoryController.updateManyWalletsCategories); // 🔒 Masowa aktualizacja kategorii
router.patch('/update-wallets-category/:walletsCategoryId', checkAuth, historyLogger('walletsCategory'), walletsCategoryController.updateWalletsCategory); // 🔒 Aktualizacja kategorii
router.delete('/delete-all-wallets-categories', checkAuth, historyLogger('walletsCategory'), walletsCategoryController.deleteAllWalletsCategories); // 🔒 Usuń wszystkie kategorie

module.exports = router;