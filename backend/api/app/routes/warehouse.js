const express = require('express');
const router = express.Router();
const warehouseController = require('../controllers/warehouse');

// POST /api/warehouse/move-to-user - Move item from warehouse to user
router.post('/move-to-user', warehouseController.moveItemToUser);

// GET /api/warehouse/report - Generate warehouse report (movements)
router.get('/report', warehouseController.generateReport);

// GET /api/warehouse/inventory - Generate inventory report (state on specific date)
router.get('/inventory', warehouseController.generateInventoryReport);

module.exports = router;
