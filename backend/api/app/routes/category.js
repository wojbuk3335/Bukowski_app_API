const express = require("express");
const router = express.Router();
const CategoriesController = require('../controllers/category');

router.get('/get-all-categories', CategoriesController.getAllCategories);
router.post('/insert-many-categories', CategoriesController.insertManyCategories);
router.delete('/delete-all-categories', CategoriesController.deleteAllCategories);
router.get('/:categoryId', CategoriesController.getCategoryById);
router.patch('/update-category/:categoryId', CategoriesController.updateCategoryById);

module.exports = router;
