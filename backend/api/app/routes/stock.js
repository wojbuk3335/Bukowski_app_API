const express = require("express");
const router = express.Router();
const StockController = require('../controllers/stock');
const historyLogger = require('../middleware/historyLogger');

router.get('/get-all-stocks', StockController.getAllStocks);
router.post('/insert-many-stocks', historyLogger('stock'), StockController.insertManyStocks);
router.delete('/delete-all-stocks', historyLogger('stock'), StockController.deleteAllStocks);
router.get('/:stockId', StockController.getStockById);
router.patch('/update-stock/:stockId', historyLogger('stock'), StockController.updateStockById);
router.put('/:stockId', historyLogger('stock'), StockController.updateStockById); // Add PUT route for tests

module.exports = router;