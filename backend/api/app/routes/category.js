const express = require("express");
const router = express.Router();
const CategoryController = require('../controllers/category');

router.get('/get-all-categories', CategoryController.getAllCategories);
router.post('/insert-many-categories', CategoryController.insertManyCategories);
router.delete('/delete-all-categories', CategoryController.deleteAllCategories);
router.get('/:categoryId', CategoryController.getCategoryById);
router.patch('/update-category/:categoryId', CategoryController.updateCategoryById);

module.exports = router;
