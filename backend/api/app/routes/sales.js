const express = require("express");
const router = express.Router();
const SalesController = require('../controllers/sales');
const historyLogger = require('../middleware/historyLogger');
const checkAuth = require('../middleware/check-auth'); // ZABEZPIECZENIA SPRZEDAŻY

// ========== WSZYSTKIE ENDPOINTY SPRZEDAŻOWE WYMAGAJĄ AUTORYZACJI ==========
router.get('/', checkAuth, SalesController.getAllSales); // 🔒 Wszystkie sprzedaże
router.get('/get-all-sales', checkAuth, SalesController.getAllSales); // 🔒 Duplikat
router.get('/filter-by-date-and-point', checkAuth, SalesController.getSalesByDateAndSellingPoint); // 🔒 Filtrowanie
router.post('/save-sales', checkAuth, SalesController.saveSales); // 🔒 Zapisywanie sprzedaży
router.post('/insert-many-sales', checkAuth, SalesController.insertManySales); // 🔒 Masowe dodawanie
router.delete('/delete-all-sales', checkAuth, SalesController.deleteAllSales); // 🔒 NIEBEZPIECZNE: Usuń wszystkie

// Dynamic routes - też zabezpieczone
router.get('/:salesId', checkAuth, SalesController.getSalesById); // 🔒 Konkretna sprzedaż
router.patch('/update-sales/:salesId', checkAuth, SalesController.updateSalesById); // 🔒 Aktualizacja
router.delete('/delete-sale/:salesId', checkAuth, SalesController.deleteSalesById); // 🔒 Usuwanie

module.exports = router;