const express = require('express');
const router = express.Router();
const historyController = require('../controllers/history');

router.get('/', historyController.getAllHistory);
//delete all history
router.delete('/remove', historyController.removeAllHistory);
//delete history records by transaction ID
router.delete('/by-transaction/:transactionId', historyController.deleteByTransactionId);
//delete history records by transaction details (fallback method)
router.post('/delete-by-details', historyController.deleteByTransactionDetails);
//delete single item from history
router.post('/delete-single-item', historyController.deleteSingleItem);
//delete single record by ID
router.delete('/:id', historyController.deleteSingleRecord);

module.exports = router;
