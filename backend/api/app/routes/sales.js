const express = require("express");
const router = express.Router();
const SalesController = require('../controllers/sales');
const historyLogger = require('../middleware/historyLogger');

router.get('/get-all-sales', SalesController.getAllSales);
router.post('/save-sales',SalesController.saveSales);
router.post('/insert-many-sales', SalesController.insertManySales);
router.delete('/delete-all-sales', SalesController.deleteAllSales);
router.get('/:salesId', SalesController.getSalesById);
router.patch('/update-sales/:salesId', SalesController.updateSalesById);

module.exports = router;