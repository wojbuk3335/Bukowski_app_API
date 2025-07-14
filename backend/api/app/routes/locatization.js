const express = require("express");
const router = express.Router();
const LocalizationController = require('../controllers/localization');
const historyLogger = require('../middleware/historyLogger');

router.get('/get-all-localizations', LocalizationController.getAllLocalizations);
router.post('/insert-many-localizations', historyLogger('localization'), LocalizationController.insertManyLocalizations);
router.delete('/delete-all-localizations', historyLogger('localization'), LocalizationController.deleteAllLocalizations);
router.get('/:localizationId', LocalizationController.getLocalizationById);
router.patch('/update-localization/:localizationId', historyLogger('localization'), LocalizationController.updateLocalizationById);

module.exports = router;