const express = require('express');
const router = express.Router();
const CorrectionsController = require('../controllers/corrections');

// Pobierz wszystkie korekty
// GET /api/corrections
router.get('/', CorrectionsController.getAllCorrections);

// Pobierz korekty według statusu
// GET /api/corrections/status/PENDING
router.get('/status/:status', CorrectionsController.getCorrectionsByStatus);

// Pobierz korekty dla konkretnego punktu sprzedaży
// GET /api/corrections/selling-point/Parzygnat
router.get('/selling-point/:sellingPoint', CorrectionsController.getCorrectionsBySellingPoint);

// Pobierz statystyki korekt
// GET /api/corrections/stats
router.get('/stats', CorrectionsController.getCorrectionsStats);

// Dodaj pojedynczą korektę
// POST /api/corrections
router.post('/', CorrectionsController.saveCorrection);

// Dodaj wiele korekt jednocześnie (z systemu wykrywania braków)
// POST /api/corrections/multiple
router.post('/multiple', CorrectionsController.saveMultipleCorrections);

// Zaktualizuj status korekty
// PUT /api/corrections/:id
router.put('/:id', CorrectionsController.updateCorrectionStatus);

// Usuń korektę
// DELETE /api/corrections/:id
router.delete('/:id', CorrectionsController.deleteCorrection);

module.exports = router;
