const express = require("express");
const router = express.Router();
const SizesController = require('../controllers/sizes');
const historyLogger = require('../middleware/historyLogger');
const checkAuth = require('../middleware/check-auth'); // 🔒 ROZMIARY - KONFIGURACJA PRODUKTÓW

// ========== WSZYSTKIE OPERACJE NA ROZMIARACH WYMAGAJĄ AUTORYZACJI ==========
router.get('/', checkAuth, SizesController.getAllSizes); // 🔒 Root GET route - lista rozmiarów
router.get('/get-all-sizes', checkAuth, SizesController.getAllSizes); // 🔒 Lista rozmiarów
router.post('/insert-many-sizes', checkAuth, historyLogger('sizes'), SizesController.insertManySizes); // 🔒 Masowe dodawanie rozmiarów
router.delete('/delete-all-sizes', checkAuth, historyLogger('sizes'), SizesController.deleteAllSizes); // 🔒 Usuń wszystkie rozmiary
router.get('/:sizeId', checkAuth, SizesController.getSizeById); // 🔒 Konkretny rozmiar
router.patch('/update-size/:sizeId', checkAuth, historyLogger('sizes'), SizesController.updateSizeById); // 🔒 Aktualizacja rozmiaru

module.exports = router;