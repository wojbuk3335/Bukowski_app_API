const express = require('express');
const router = express.Router();
const WalletsCategoryController = require('../controllers/walletsCategory');
const historyLogger = require('../middleware/historyLogger');

const walletsCategoryController = new WalletsCategoryController();

// Get all wallets categories
router.get('/get-all-wallets-categories', walletsCategoryController.getAllWalletsCategories);

// Insert many wallets categories
router.post('/insert-many-wallets-categories', historyLogger('walletsCategory'), walletsCategoryController.insertManyWalletsCategories);

// Update many wallets categories
router.post('/update-many-wallets-categories', historyLogger('walletsCategory'), walletsCategoryController.updateManyWalletsCategories);

// Update single wallets category
router.patch('/update-wallets-category/:walletsCategoryId', historyLogger('walletsCategory'), walletsCategoryController.updateWalletsCategory);

// Delete all wallets categories
router.delete('/delete-all-wallets-categories', historyLogger('walletsCategory'), walletsCategoryController.deleteAllWalletsCategories);

module.exports = router;