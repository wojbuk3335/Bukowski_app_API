const express = require('express');
const router = express.Router();
const warehouseController = require('../controllers/warehouse');

// POST /api/warehouse/move-to-user - Move item from warehouse to user
router.post('/move-to-user', warehouseController.moveItemToUser);

module.exports = router;
