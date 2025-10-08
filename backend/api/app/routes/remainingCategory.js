const express = require('express');
const router = express.Router();
const RemainingCategoryController = require('../controllers/remainingCategory');
const historyLogger = require('../middleware/historyLogger');

// Get all remaining categories
router.get('/get-all-remaining-categories', RemainingCategoryController.getAllRemainingCategories);

// Insert many remaining categories
router.post('/insert-many-remaining-categories', historyLogger('remainingCategory'), RemainingCategoryController.insertManyRemainingCategories);

// Update many remaining categories
router.post('/update-many-remaining-categories', historyLogger('remainingCategory'), RemainingCategoryController.updateManyRemainingCategories);

// Update single remaining category
router.patch('/update-remaining-category/:id', historyLogger('remainingCategory'), RemainingCategoryController.updateRemainingCategory);

// Delete single remaining category
router.delete('/delete-remaining-category/:id', historyLogger('remainingCategory'), RemainingCategoryController.deleteRemainingCategory);

// Delete all remaining categories
router.delete('/delete-all-remaining-categories', historyLogger('remainingCategory'), RemainingCategoryController.deleteAllRemainingCategories);

module.exports = router;