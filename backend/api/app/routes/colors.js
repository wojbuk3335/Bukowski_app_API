const express = require("express");
const router = express.Router();
const ColorsController = require('../controllers/colors');
const historyLogger = require('../middleware/historyLogger');
const checkAuth = require('../middleware/check-auth'); // 🔒 KOLORY - KONFIGURACJA PRODUKTÓW

// ========== WSZYSTKIE OPERACJE NA KOLORACH WYMAGAJĄ AUTORYZACJI ==========
router.get('/get-all-colors', checkAuth, ColorsController.getAllColors); // 🔒 Lista kolorów
router.post('/insert-many-colors', checkAuth, historyLogger('colors'), ColorsController.insertManyColors); // 🔒 Masowe dodawanie kolorów
router.delete('/delete-all-colors', checkAuth, historyLogger('colors'), ColorsController.deleteAllColors); // 🔒 Usuń wszystkie kolory
router.get('/:colorId', checkAuth, ColorsController.getColorById); // 🔒 Konkretny kolor
router.patch('/update-color/:colorId', checkAuth, historyLogger('colors'), ColorsController.updateColorById); // 🔒 Aktualizacja koloru
router.put('/:colorId', checkAuth, historyLogger('colors'), ColorsController.updateColorById); // 🔒 PUT route

module.exports = router;