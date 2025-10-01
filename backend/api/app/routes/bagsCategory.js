const express = require('express');
const router = express.Router();
const BagsCategoryController = require('../controllers/bagsCategory');
const historyLogger = require('../middleware/historyLogger');

const bagsCategoryController = new BagsCategoryController();

// Get all bags categories
router.get('/get-all-bags-categories', bagsCategoryController.getAllBagsCategories);

// Insert many bags categories
router.post('/insert-many-bags-categories', historyLogger('bagsCategory'), bagsCategoryController.insertManyBagsCategories);

// Update many bags categories
router.post('/update-many-bags-categories', historyLogger('bagsCategory'), bagsCategoryController.updateManyBagsCategories);

// Update single bags category
router.patch('/update-bags-category/:bagsCategoryId', historyLogger('bagsCategory'), bagsCategoryController.updateBagsCategory);

// Delete all bags categories
router.delete('/delete-all-bags-categories', historyLogger('bagsCategory'), bagsCategoryController.deleteAllBagsCategories);

module.exports = router;