const express = require('express');
const router = express.Router();
const BagsCategoryController = require('../controllers/bagsCategory');
const historyLogger = require('../middleware/historyLogger');
const checkAuth = require('../middleware/check-auth'); // 🔒 KATEGORIE TOREB

const bagsCategoryController = new BagsCategoryController();

// ========== WSZYSTKIE OPERACJE NA KATEGORIACH TOREB WYMAGAJĄ AUTORYZACJI ==========
router.get('/get-all-bags-categories', checkAuth, bagsCategoryController.getAllBagsCategories); // 🔒 Lista kategorii toreb
router.post('/insert-many-bags-categories', checkAuth, historyLogger('bagsCategory'), bagsCategoryController.insertManyBagsCategories); // 🔒 Masowe dodawanie kategorii
router.post('/update-many-bags-categories', checkAuth, historyLogger('bagsCategory'), bagsCategoryController.updateManyBagsCategories); // 🔒 Masowa aktualizacja kategorii
router.patch('/update-bags-category/:bagsCategoryId', checkAuth, historyLogger('bagsCategory'), bagsCategoryController.updateBagsCategory); // 🔒 Aktualizacja kategorii
router.delete('/delete-all-bags-categories', checkAuth, historyLogger('bagsCategory'), bagsCategoryController.deleteAllBagsCategories); // 🔒 Usuń wszystkie kategorie

module.exports = router;