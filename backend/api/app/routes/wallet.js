const express = require('express');
const router = express.Router();
const walletController = require('../controllers/wallet');
const historyLogger = require('../middleware/historyLogger');

// Get all wallets
router.get('/get-all-wallets', walletController.getAllWallets);

// Insert many wallets
router.post('/insert-many-wallets', historyLogger('wallets'), walletController.insertManyWallets);

// Update many wallets
router.post('/update-many-wallets', historyLogger('wallets'), walletController.updateManyWallets);

// Update single wallet
router.patch('/update-wallet/:id', historyLogger('wallets'), walletController.updateWallet);

// Delete single wallet
router.delete('/delete-wallet/:id', historyLogger('wallets'), walletController.deleteWallet);

// Delete all wallets
router.delete('/delete-all-wallets', historyLogger('wallets'), walletController.deleteAllWallets);

module.exports = router;