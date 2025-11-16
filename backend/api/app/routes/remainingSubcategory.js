const express = require('express');
const router = express.Router();
const RemainingSubcategoryController = require('../controllers/remainingSubcategory');
const historyLogger = require('../middleware/historyLogger');
const checkAuth = require('../middleware/check-auth'); // 🔒 POZOSTAŁE PODKATEGORIE

// ========== WSZYSTKIE OPERACJE NA POZOSTAŁYCH PODKATEGORIACH WYMAGAJĄ AUTORYZACJI ==========
router.get('/get-all-remaining-subcategories', checkAuth, RemainingSubcategoryController.getAllRemainingSubcategories); // 🔒 Lista pozostałych podkategorii
router.get('/get-by-category/:categoryId', checkAuth, RemainingSubcategoryController.getRemainingSubcategoriesByCategory); // 🔒 Podkategorie według kategorii
router.post('/insert-many-remaining-subcategories', checkAuth, 
    historyLogger('remainingSubcategories'), 
    RemainingSubcategoryController.insertManyRemainingSubcategories
); // 🔒 Masowe dodawanie podkategorii
router.patch('/update-remaining-subcategory/:id', checkAuth, 
    historyLogger('remainingSubcategories'), 
    RemainingSubcategoryController.updateRemainingSubcategoryById
); // 🔒 Aktualizacja podkategorii

module.exports = router;