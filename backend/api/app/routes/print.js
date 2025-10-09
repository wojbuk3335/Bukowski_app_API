const express = require('express');
const router = express.Router();
const printController = require('../controllers/print');

router.post('/print-barcodes', printController.printBarcodes);
router.post('/print-label', printController.printLabel);
router.post('/zebra', printController.printLabel); // Alias dla drukarki Zebra
router.post('/zebra-usb', printController.printLabelUSB); // Drukarka USB

module.exports = router;
