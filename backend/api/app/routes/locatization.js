const express = require("express");
const router = express.Router();
const LocalizationController = require('../controllers/localization');
const historyLogger = require('../middleware/historyLogger');
const checkAuth = require('../middleware/check-auth'); // 🔒 LOKALIZACJE

// ========== WSZYSTKIE OPERACJE NA LOKALIZACJACH WYMAGAJĄ AUTORYZACJI ==========
router.get('/get-all-localizations', checkAuth, LocalizationController.getAllLocalizations); // 🔒 Lista lokalizacji
router.post('/insert-many-localizations', checkAuth, historyLogger('localization'), LocalizationController.insertManyLocalizations); // 🔒 Masowe dodawanie lokalizacji
router.delete('/delete-all-localizations', checkAuth, historyLogger('localization'), LocalizationController.deleteAllLocalizations); // 🔒 Usuń wszystkie lokalizacje
router.get('/:localizationId', checkAuth, LocalizationController.getLocalizationById); // 🔒 Konkretna lokalizacja
router.patch('/update-localization/:localizationId', checkAuth, historyLogger('localization'), LocalizationController.updateLocalizationById); // 🔒 Aktualizacja lokalizacji

module.exports = router;