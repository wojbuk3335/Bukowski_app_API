const express = require('express');
const router = express.Router();
const printController = require('../controllers/print');

router.post('/print-barcodes', printController.printBarcodes);
router.post('/print-label', printController.printLabel);

module.exports = router;
