const express = require("express");
const router = express.Router();
const CategoryController = require('../controllers/category');
const historyLogger = require('../middleware/historyLogger');


router.get('/get-all-categories', CategoryController.getAllCategories);
router.post('/insert-many-categories',historyLogger('category'),CategoryController.insertManyCategories);
router.delete('/delete-all-categories',historyLogger('category'),CategoryController.deleteAllCategories);
router.get('/:categoryId', CategoryController.getCategoryById);
router.patch('/update-category/:categoryId',historyLogger('category'), CategoryController.updateCategoryById);

module.exports = router;
