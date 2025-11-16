const express = require('express');
const router = express.Router();
const beltsController = require('../controllers/belts');
const historyLogger = require('../middleware/historyLogger');
const checkAuth = require('../middleware/check-auth'); // 🔒 PASKI - ZABEZPIECZENIE PRODUKTÓW

// ========== WSZYSTKIE OPERACJE NA PASKACH WYMAGAJĄ AUTORYZACJI ==========
router.get('/', checkAuth, beltsController.getAllBelts); // 🔒 Lista wszystkich pasków
router.post('/', checkAuth, historyLogger('belts'), beltsController.createBelt); // 🔒 Dodawanie paska
router.put('/:beltId', checkAuth, historyLogger('belts'), beltsController.updateBelt); // 🔒 Aktualizacja paska
router.delete('/:beltId', checkAuth, historyLogger('belts'), beltsController.deleteBelt); // 🔒 Usuwanie paska

module.exports = router;