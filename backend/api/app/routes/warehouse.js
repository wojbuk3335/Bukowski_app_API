const express = require('express');
const router = express.Router();
const warehouseController = require('../controllers/warehouse');
const checkAuth = require('../middleware/check-auth'); // 🔒 MAGAZYN - KLUCZOWE ZABEZPIECZENIE

// ========== WSZYSTKIE OPERACJE MAGAZYNOWE WYMAGAJĄ AUTORYZACJI ==========
router.post('/move-to-user', checkAuth, warehouseController.moveItemToUser); // 🔒 Przenoszenie z magazynu do użytkownika
router.get('/report', checkAuth, warehouseController.generateReport); // 🔒 Raport magazynowy
router.get('/inventory', checkAuth, warehouseController.generateInventoryReport); // 🔒 Raport inwentarza

module.exports = router;
