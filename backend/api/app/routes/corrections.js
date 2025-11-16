const express = require('express');
const router = express.Router();
const CorrectionsController = require('../controllers/corrections');
const checkAuth = require('../middleware/check-auth'); // 🔒 KOREKTY - KONTROLA BŁĘDÓW SYSTEMU

// ========== WSZYSTKIE OPERACJE KOREKT WYMAGAJĄ AUTORYZACJI ==========
router.get('/', checkAuth, CorrectionsController.getAllCorrections); // 🔒 Wszystkie korekty
router.get('/status/:status', checkAuth, CorrectionsController.getCorrectionsByStatus); // 🔒 Korekty według statusu
router.get('/selling-point/:sellingPoint', checkAuth, CorrectionsController.getCorrectionsBySellingPoint); // 🔒 Korekty dla punktu sprzedaży
router.get('/stats', checkAuth, CorrectionsController.getCorrectionsStats); // 🔒 Statystyki korekt
router.post('/', checkAuth, CorrectionsController.saveCorrection); // 🔒 Dodawanie korekty
router.post('/multiple', checkAuth, CorrectionsController.saveMultipleCorrections); // 🔒 Masowe dodawanie korekt
router.put('/:id', checkAuth, CorrectionsController.updateCorrectionStatus); // 🔒 Aktualizacja statusu korekty
router.delete('/:id', checkAuth, CorrectionsController.deleteCorrection); // 🔒 Usuwanie korekty

module.exports = router;
