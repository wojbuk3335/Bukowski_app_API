const express = require("express");
const router = express.Router();
const CategoryController = require('../controllers/category');
const historyLogger = require('../middleware/historyLogger');
const checkAuth = require('../middleware/check-auth'); // 🔒 KATEGORIE - STRUKTURA PRODUKTÓW

// ========== WSZYSTKIE OPERACJE NA KATEGORIACH WYMAGAJĄ AUTORYZACJI ==========
router.get('/get-all-categories', checkAuth, CategoryController.getAllCategories); // 🔒 Lista kategorii
router.post('/insert-many-categories', checkAuth, historyLogger('category'), CategoryController.insertManyCategories); // 🔒 Masowe dodawanie kategorii
router.delete('/delete-all-categories', checkAuth, historyLogger('category'), CategoryController.deleteAllCategories); // 🔒 Usuń wszystkie kategorie
router.get('/:categoryId', checkAuth, CategoryController.getCategoryById); // 🔒 Konkretna kategoria
router.patch('/update-category/:categoryId', checkAuth, historyLogger('category'), CategoryController.updateCategoryById); // 🔒 Aktualizacja kategorii

module.exports = router;
