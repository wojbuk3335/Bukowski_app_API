const express = require('express');
const router = express.Router();
const RemainingSubcategoryController = require('../controllers/remainingSubcategory');
const historyLogger = require('../middleware/historyLogger');

// GET all remaining subcategories
router.get('/get-all-remaining-subcategories', RemainingSubcategoryController.getAllRemainingSubcategories);

// GET remaining subcategories by category
router.get('/get-by-category/:categoryId', RemainingSubcategoryController.getRemainingSubcategoriesByCategory);

// POST - Insert many remaining subcategories
router.post('/insert-many-remaining-subcategories', 
    historyLogger('remainingSubcategories'), 
    RemainingSubcategoryController.insertManyRemainingSubcategories
);

// PATCH - Update remaining subcategory by ID
router.patch('/update-remaining-subcategory/:id', 
    historyLogger('remainingSubcategories'), 
    RemainingSubcategoryController.updateRemainingSubcategoryById
);

module.exports = router;