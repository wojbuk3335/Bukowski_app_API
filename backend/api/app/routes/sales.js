const express = require("express");
const router = express.Router();
const SalesController = require('../controllers/sales');
const historyLogger = require('../middleware/historyLogger');

// Define specific routes first
router.get('/get-all-sales', SalesController.getAllSales);
router.get('/filter-by-date-and-point', SalesController.getSalesByDateAndSellingPoint);
router.post('/save-sales', SalesController.saveSales);
router.post('/insert-many-sales', SalesController.insertManySales);
router.delete('/delete-all-sales', SalesController.deleteAllSales);

// Define dynamic routes after specific ones
router.get('/:salesId', SalesController.getSalesById);
router.patch('/update-sales/:salesId', SalesController.updateSalesById);
router.delete('/delete-sale/:salesId', SalesController.deleteSalesById);

module.exports = router;