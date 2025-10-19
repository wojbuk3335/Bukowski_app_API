const express = require("express");
const router = express.Router();
const StockController = require('../controllers/stock');
const historyLogger = require('../middleware/historyLogger');
const checkAuth = require('../middleware/check-auth'); // 🔒 STOCK - CAŁY ASORTYMENT PRODUKTÓW

// ========== WSZYSTKIE OPERACJE NA STOCK WYMAGAJĄ AUTORYZACJI ==========
router.get('/get-all-stocks', checkAuth, StockController.getAllStocks); // 🔒 Cały asortyment produktów
router.post('/insert-many-stocks', checkAuth, historyLogger('stock'), StockController.insertManyStocks); // 🔒 Masowe dodawanie produktów
router.delete('/delete-all-stocks', checkAuth, historyLogger('stock'), StockController.deleteAllStocks); // 🔒 NIEBEZPIECZNE: Usuń cały asortyment
router.get('/:stockId', checkAuth, StockController.getStockById); // 🔒 Konkretny produkt
router.patch('/update-stock/:stockId', checkAuth, historyLogger('stock'), StockController.updateStockById); // 🔒 Aktualizacja produktu
router.put('/:stockId', checkAuth, historyLogger('stock'), StockController.updateStockById); // 🔒 PUT route dla testów

module.exports = router;