const express = require("express");
const router = express.Router();
const StockController = require('../controllers/stock');

router.get('/get-all-stocks', StockController.getAllStocks);
router.post('/insert-many-stocks', StockController.insertManyStocks);
router.delete('/delete-all-stocks', StockController.deleteAllStocks);
router.get('/:stockId', StockController.getStockById);
router.patch('/update-stock/:stockId', StockController.updateStockById);

module.exports = router;