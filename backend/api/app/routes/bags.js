const express = require('express');
const router = express.Router();
const bagsController = require('../controllers/bags');
const historyLogger = require('../middleware/historyLogger');

// Get all bags
router.get('/get-all-bags', bagsController.getAllBags);

// Insert many bags
router.post('/insert-bags', bagsController.insertManyBags);

// Update many bags
router.post('/update-many-bags', bagsController.updateManyBags);

// Update single bags
router.patch('/update-bags/:id', bagsController.updateBags);

// Delete single bags
router.delete('/delete-bags/:id', historyLogger('bags'), bagsController.deleteBags);

// Delete all bags
router.delete('/delete-all-bags', historyLogger('bags'), bagsController.deleteAllBags);

module.exports = router;
