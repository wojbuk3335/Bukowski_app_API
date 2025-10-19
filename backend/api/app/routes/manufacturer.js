const express = require('express');
const router = express.Router();
const manufacturerController = require('../controllers/manufacturer');
const historyLogger = require('../middleware/historyLogger');
const checkAuth = require('../middleware/check-auth'); // 🔒 PRODUCENCI - DANE BIZNESOWE

// ========== WSZYSTKIE OPERACJE NA PRODUCENTACH WYMAGAJĄ AUTORYZACJI ==========
router.get('/', checkAuth, manufacturerController.getAllManufacturers); // 🔒 Lista producentów
router.post('/', checkAuth, historyLogger('manufacturers'), manufacturerController.createManufacturer); // 🔒 Dodawanie producenta
router.put('/:manufacturerId', checkAuth, historyLogger('manufacturers'), manufacturerController.updateManufacturer); // 🔒 Aktualizacja producenta
router.delete('/:manufacturerId', checkAuth, historyLogger('manufacturers'), manufacturerController.deleteManufacturer); // 🔒 Usuwanie producenta

module.exports = router;