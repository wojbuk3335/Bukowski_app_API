const express = require('express');
const router = express.Router();
const manufacturerController = require('../controllers/manufacturer');
const historyLogger = require('../middleware/historyLogger');

// GET /api/manufacturers - pobierz wszystkich producentów
router.get('/', manufacturerController.getAllManufacturers);

// POST /api/manufacturers - dodaj nowego producenta
router.post('/', historyLogger('manufacturers'), manufacturerController.createManufacturer);

// PUT /api/manufacturers/:manufacturerId - zaktualizuj producenta
router.put('/:manufacturerId', historyLogger('manufacturers'), manufacturerController.updateManufacturer);

// DELETE /api/manufacturers/:manufacturerId - usuń producenta
router.delete('/:manufacturerId', historyLogger('manufacturers'), manufacturerController.deleteManufacturer);

module.exports = router;