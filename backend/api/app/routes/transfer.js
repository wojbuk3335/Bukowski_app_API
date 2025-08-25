const express = require('express');
const router = express.Router();
const transferController = require('../controllers/transfer');

// Test API route
router.get('/test', (req, res) => {
    res.status(200).json({ message: 'API is working!' });
});

// Transfer API routes
router.post('/', transferController.createTransfer);
router.get('/', transferController.getTransfers);
router.get('/debug/all', transferController.getAllTransfersDebug); // DEBUG endpoint
router.get('/:id', transferController.getTransferById);
router.put('/:id', transferController.updateTransfer);
router.delete('/all', transferController.deleteAllTransfers); // Define this route first
router.delete('/by-id/:id', transferController.deleteTransferById); // TEMPORARY: Delete by _id
router.delete('/:productId', transferController.deleteTransferByProductId); // Use productId for deletion
router.patch('/:id/cancel', transferController.cancelTransfer);
router.post('/manage-indexes', transferController.manageIndexes); // New endpoint for index management

module.exports = router;