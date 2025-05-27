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
router.get('/:id', transferController.getTransferById);
router.put('/:id', transferController.updateTransfer);
router.delete('/all', transferController.deleteAllTransfers); // Define this route first
router.delete('/:productId', transferController.deleteTransferByProductId); // Use productId for deletion
router.patch('/:id/cancel', transferController.cancelTransfer);

module.exports = router;