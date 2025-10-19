const express = require('express');
const router = express.Router();
const glovesController = require('../controllers/gloves');
const historyLogger = require('../middleware/historyLogger');
const checkAuth = require('../middleware/check-auth'); // 🔒 RĘKAWICZKI - ZABEZPIECZENIE PRODUKTÓW

// ========== WSZYSTKIE OPERACJE NA RĘKAWICZKACH WYMAGAJĄ AUTORYZACJI ==========
router.get('/', checkAuth, glovesController.getAllGloves); // 🔒 Lista rękawiczek
router.post('/', checkAuth, historyLogger('gloves'), glovesController.createGlove); // 🔒 Dodawanie rękawiczki
router.put('/:gloveId', checkAuth, historyLogger('gloves'), glovesController.updateGlove); // 🔒 Aktualizacja rękawiczki
router.delete('/:gloveId', checkAuth, historyLogger('gloves'), glovesController.deleteGlove); // 🔒 Usuwanie rękawiczki

module.exports = router;