const express = require('express');
const router = express.Router();
const TransferProcessingController = require('../controllers/transferProcessing');

// POST /api/transfer/process-all - Process all transfers and remove items from state
router.post('/process-all', TransferProcessingController.processAllTransfers);

// POST /api/transfer/process-single - Process single transfer and remove item from state
router.post('/process-single', TransferProcessingController.processSingleTransfer);

module.exports = router;
