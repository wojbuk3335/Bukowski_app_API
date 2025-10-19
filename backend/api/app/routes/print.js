const express = require('express');
const router = express.Router();
const printController = require('../controllers/print');
const checkAuth = require('../middleware/check-auth'); // 🔒 DRUKOWANIE - KONTROLA DOSTĘPU

// ========== WSZYSTKIE OPERACJE DRUKOWANIA WYMAGAJĄ AUTORYZACJI ==========
router.post('/print-barcodes', checkAuth, printController.printBarcodes); // 🔒 Drukowanie kodów kreskowych
router.post('/print-label', checkAuth, printController.printLabel); // 🔒 Drukowanie etykiet
router.post('/zebra', checkAuth, printController.printLabel); // 🔒 Alias dla drukarki Zebra
router.post('/zebra-usb', checkAuth, printController.printLabelUSB); // 🔒 Drukarka USB

module.exports = router;
