const express = require('express');
const router = express.Router();
const warehouseController = require('../controllers/warehouse');
const checkAuth = require('../middleware/check-auth'); // 🔒 MAGAZYN - KLUCZOWE ZABEZPIECZENIE
const roleAuth = require('../middleware/role-auth'); // 🔒 KONTROLA RÓL
const validators = require('../middleware/validators'); // 🔒 WALIDACJA DANYCH

// ========== WSZYSTKIE OPERACJE MAGAZYNOWE WYMAGAJĄ AUTORYZACJI ==========
router.post('/move-to-user', 
    validators.warehouseValidation,
    validators.handleValidationErrors,
    checkAuth, 
    roleAuth.adminOrMagazyn(), 
    warehouseController.moveItemToUser
); // 🔒🔒 Przenoszenie z magazynu - tylko admin/magazyn

router.get('/report', 
    validators.queryValidation,
    validators.handleValidationErrors,
    checkAuth, 
    roleAuth.privilegedUsers(), 
    warehouseController.generateReport
); // 🔒🔒 Raport - tylko uprzywilejowani

router.get('/inventory', 
    validators.queryValidation,
    validators.handleValidationErrors,
    checkAuth, 
    roleAuth.privilegedUsers(), 
    warehouseController.generateInventoryReport
); // 🔒🔒 Inwentarz - tylko uprzywilejowani

module.exports = router;
