const express = require('express');
const router = express.Router();
const transferController = require('../controllers/transfer');
const checkAuth = require('../middleware/check-auth'); // 🔒 TRANSFERY - KRYTYCZNE ZABEZPIECZENIE

// ========== ZABEZPIECZONE ENDPOINTY TESTOWE ==========
router.get('/test', checkAuth, (req, res) => {
    res.status(200).json({ message: 'API is working!' });
}); // 🔒 Test endpoint teraz wymaga autoryzacji

// ========== WSZYSTKIE TRANSFERY WYMAGAJĄ AUTORYZACJI ==========
router.post('/', checkAuth, transferController.createTransfer); // 🔒 Tworzenie transferu
router.get('/', checkAuth, transferController.getTransfers); // 🔒 Lista transferów
router.get('/debug/all', checkAuth, transferController.getAllTransfersDebug); // 🔒 DEBUG - wrażliwe dane
router.get('/:id', checkAuth, transferController.getTransferById); // 🔒 Konkretny transfer
router.put('/:id', checkAuth, transferController.updateTransfer); // 🔒 Aktualizacja transferu
router.delete('/all', checkAuth, transferController.deleteAllTransfers); // 🔒 BARDZO NIEBEZPIECZNE - usuń wszystkie
router.delete('/by-id/:id', checkAuth, transferController.deleteTransferById); // 🔒 Usuń po ID
router.delete('/:productId', checkAuth, transferController.deleteTransferByProductId); // 🔒 Usuń po productId
router.patch('/:id/cancel', checkAuth, transferController.cancelTransfer); // 🔒 Anulowanie transferu
router.post('/manage-indexes', checkAuth, transferController.manageIndexes); // 🔒 Zarządzanie indeksami

module.exports = router;