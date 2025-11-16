const express = require("express");
const router = express.Router();
const SubcategoryCoatsController = require('../controllers/subcategoryCoats');
const historyLogger = require('../middleware/historyLogger');
const checkAuth = require('../middleware/check-auth'); // 🔒 PODKATEGORIE PŁASZCZY

// ========== WSZYSTKIE OPERACJE NA PODKATEGORIACH PŁASZCZY WYMAGAJĄ AUTORYZACJI ==========
router.get('/get-all-subcategoryCoats', checkAuth, SubcategoryCoatsController.getAllSubcategoryCoats); // 🔒 Lista podkategorii płaszczy
router.post('/insert-many-subcategoryCoats', checkAuth, historyLogger('subcategoryCoats'), SubcategoryCoatsController.insertManySubcategoryCoats); // 🔒 Masowe dodawanie podkategorii
router.delete('/delete-all-subcategoryCoats', checkAuth, historyLogger('subcategoryCoats'), SubcategoryCoatsController.deleteAllSubcategoryCoats); // 🔒 Usuń wszystkie podkategorie
router.get('/:subcategoryCoatsId', checkAuth, SubcategoryCoatsController.getSubcategoryCcoatsById); // 🔒 Konkretna podkategoria
router.patch('/update-subcategoryCoats/:subcategoryCoatsId', checkAuth, historyLogger('subcategoryCoats'), SubcategoryCoatsController.updateSubcategoryCoatsById); // 🔒 Aktualizacja podkategorii

module.exports = router;