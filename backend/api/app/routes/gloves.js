const express = require('express');
const router = express.Router();
const glovesController = require('../controllers/gloves');
const historyLogger = require('../middleware/historyLogger');

// GET /api/gloves - pobierz wszystkie rękawiczki
router.get('/', glovesController.getAllGloves);

// POST /api/gloves - dodaj nową rękawiczkę
router.post('/', historyLogger('gloves'), glovesController.createGlove);

// PUT /api/gloves/:gloveId - zaktualizuj rękawiczkę
router.put('/:gloveId', historyLogger('gloves'), glovesController.updateGlove);

// DELETE /api/gloves/:gloveId - usuń rękawiczkę
router.delete('/:gloveId', historyLogger('gloves'), glovesController.deleteGlove);

module.exports = router;