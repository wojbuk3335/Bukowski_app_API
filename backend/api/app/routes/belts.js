const express = require('express');
const router = express.Router();
const beltsController = require('../controllers/belts');
const historyLogger = require('../middleware/historyLogger');

// GET /api/belts - pobierz wszystkie paski
router.get('/', beltsController.getAllBelts);

// POST /api/belts - dodaj nowy pasek
router.post('/', historyLogger('belts'), beltsController.createBelt);

// PUT /api/belts/:beltId - zaktualizuj pasek
router.put('/:beltId', historyLogger('belts'), beltsController.updateBelt);

// DELETE /api/belts/:beltId - usuń pasek
router.delete('/:beltId', historyLogger('belts'), beltsController.deleteBelt);

module.exports = router;