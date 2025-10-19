const express = require('express');
const router = express.Router();
const RemainingCategoryController = require('../controllers/remainingCategory');
const historyLogger = require('../middleware/historyLogger');
const checkAuth = require('../middleware/check-auth'); // 🔒 POZOSTAŁE KATEGORIE

// ========== WSZYSTKIE OPERACJE NA POZOSTAŁYCH KATEGORIACH WYMAGAJĄ AUTORYZACJI ==========
router.get('/get-all-remaining-categories', checkAuth, RemainingCategoryController.getAllRemainingCategories); // 🔒 Lista pozostałych kategorii
router.post('/insert-many-remaining-categories', checkAuth, historyLogger('remainingCategory'), RemainingCategoryController.insertManyRemainingCategories); // 🔒 Masowe dodawanie kategorii
router.post('/update-many-remaining-categories', checkAuth, historyLogger('remainingCategory'), RemainingCategoryController.updateManyRemainingCategories); // 🔒 Masowa aktualizacja kategorii
router.patch('/update-remaining-category/:id', checkAuth, historyLogger('remainingCategory'), RemainingCategoryController.updateRemainingCategory); // 🔒 Aktualizacja kategorii
router.delete('/delete-remaining-category/:id', checkAuth, historyLogger('remainingCategory'), RemainingCategoryController.deleteRemainingCategory); // 🔒 Usuwanie kategorii
router.delete('/delete-all-remaining-categories', checkAuth, historyLogger('remainingCategory'), RemainingCategoryController.deleteAllRemainingCategories); // 🔒 Usuń wszystkie kategorie

module.exports = router;