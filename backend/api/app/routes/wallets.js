const express = require('express');
const router = express.Router();
const walletsController = require('../controllers/wallets');
const historyLogger = require('../middleware/historyLogger');

// Get all wallets
router.get('/get-all-wallets', walletsController.getAllWallets);

// Insert many wallets
router.post('/insert-wallets', walletsController.insertManyWallets);

// Update many wallets
router.post('/update-many-wallets', walletsController.updateManyWallets);

// Update single wallets
router.patch('/update-wallets/:id', walletsController.updateWallets);

// Delete single wallets
router.delete('/delete-wallets/:id', historyLogger('wallets'), walletsController.deleteWallets);

// Delete all wallets
router.delete('/delete-all-wallets', historyLogger('wallets'), walletsController.deleteAllWallets);

module.exports = router;