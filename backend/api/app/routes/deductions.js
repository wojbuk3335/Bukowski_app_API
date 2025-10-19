const express = require('express');
const router = express.Router();
const deductionController = require('../controllers/deductions');
const checkAuth = require('../middleware/check-auth'); // 🔒🔒🔒 POTRĄCENIA - DANE FINANSOWE!

// ========== ZABEZPIECZONE ENDPOINTY TESTOWE ==========
router.get('/test', checkAuth, (req, res) => {
    res.status(200).json({ message: 'Deductions API is working!' });
}); // 🔒 Test endpoint teraz wymaga autoryzacji

// ========== WSZYSTKIE OPERACJE FINANSOWE WYMAGAJĄ AUTORYZACJI ==========
router.post('/', checkAuth, deductionController.createDeduction); // 🔒🔒🔒 Tworzenie potrąceń
router.get('/', checkAuth, deductionController.getDeductions); // 🔒🔒🔒 Lista potrąceń
router.get('/:id', checkAuth, deductionController.getDeductionById); // 🔒🔒🔒 Konkretne potrącenie
router.put('/:id', checkAuth, deductionController.updateDeduction); // 🔒🔒🔒 Aktualizacja potrącenia
router.delete('/all', checkAuth, deductionController.deleteAllDeductions); // 🔒🔒🔒 BARDZO NIEBEZPIECZNE - usuń wszystkie
router.delete('/:id', checkAuth, deductionController.deleteDeduction); // 🔒🔒🔒 Usuwanie potrącenia
router.get('/user/:userSymbol', checkAuth, deductionController.getDeductionsByUser); // 🔒🔒🔒 Potrącenia użytkownika

module.exports = router;
