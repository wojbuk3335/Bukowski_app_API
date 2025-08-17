const express = require('express');
const router = express.Router();
const TransferProcessingController = require('../controllers/transferProcessing');

// POST /api/transfer/process-all - Process all transfers and remove items from state
router.post('/process-all', TransferProcessingController.processAllTransfers);

// POST /api/transfer/process-warehouse - Process warehouse items and add to user state
router.post('/process-warehouse', TransferProcessingController.processWarehouseItems);

// POST /api/transfer/process-sales - Process sales items and remove from state with history
router.post('/process-sales', TransferProcessingController.processSalesItems);

// POST /api/transfer/process-single - Process single transfer and remove item from state
router.post('/process-single', TransferProcessingController.processSingleTransfer);

// POST /api/transfer/undo-last - Undo last transaction and restore items to state
router.post('/undo-last', TransferProcessingController.undoLastTransaction);

// GET /api/transfer/last-transaction - Get info about last transaction
router.get('/last-transaction', TransferProcessingController.getLastTransaction);

module.exports = router;
