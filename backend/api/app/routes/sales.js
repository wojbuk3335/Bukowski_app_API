const express = require("express");
const router = express.Router();
const SalesController = require('../controllers/sales');
const historyLogger = require('../middleware/historyLogger');
const checkAuth = require('../middleware/check-auth'); // ZABEZPIECZENIA SPRZEDAŻY
const roleAuth = require('../middleware/role-auth'); // 🔒 KONTROLA RÓL
const validators = require('../middleware/validators'); // 🔒 WALIDACJA DANYCH

// ========== WSZYSTKIE ENDPOINTY SPRZEDAŻOWE WYMAGAJĄ AUTORYZACJI ==========
router.get('/', 
    validators.queryValidation,
    validators.handleValidationErrors,
    checkAuth, 
    SalesController.getAllSales
); // 🔒 Wszystkie sprzedaże z walidacją

router.get('/get-all-sales', checkAuth, SalesController.getAllSales); // 🔒 Duplikat

router.get('/filter-by-date-and-point', 
    validators.dateValidation,
    validators.queryValidation,
    validators.handleValidationErrors,
    checkAuth, 
    SalesController.getSalesByDateAndSellingPoint
); // 🔒 Filtrowanie z walidacją dat

router.post('/save-sales', 
    validators.salesValidation,
    validators.handleValidationErrors,
    checkAuth, 
    SalesController.saveSales
); // 🔒 Zapisywanie sprzedaży z walidacją

router.post('/insert-many-sales', 
    validators.salesValidation,
    validators.handleValidationErrors,
    checkAuth, 
    SalesController.insertManySales
); // 🔒 Masowe dodawanie z walidacją

router.post('/mark-as-returned', 
    validators.handleValidationErrors,
    checkAuth, 
    SalesController.markAsReturned
); // 🔒 Oznaczanie sprzedaży jako zwrócone

router.post('/create-historical-sale', 
    validators.handleValidationErrors,
    checkAuth, 
    SalesController.createHistoricalSale
); // 🔒 Tworzenie sprzedaży historycznej
router.delete('/delete-all-sales', checkAuth, roleAuth.adminOnly(), SalesController.deleteAllSales); // 🔒🔒🔒 TYLKO ADMIN!

// Dynamic routes - też zabezpieczone
router.get('/:salesId', 
    validators.mongoIdValidation,
    validators.handleValidationErrors,
    checkAuth, 
    SalesController.getSalesById
); // 🔒 Konkretna sprzedaż z walidacją ID

router.patch('/update-sales/:salesId', 
    validators.mongoIdValidation,
    validators.salesValidation,
    validators.handleValidationErrors,
    checkAuth, 
    SalesController.updateSalesById
); // 🔒 Aktualizacja z walidacją

router.delete('/delete-sale/:salesId', 
    validators.mongoIdValidation,
    validators.handleValidationErrors,
    checkAuth, 
    SalesController.deleteSalesById
); // 🔒 Usuwanie z walidacją ID

module.exports = router;