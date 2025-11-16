const express = require('express');
const router = express.Router();
const bagsController = require('../controllers/bags');
const historyLogger = require('../middleware/historyLogger');
const checkAuth = require('../middleware/check-auth'); // 🔒 TORBY - ZABEZPIECZENIE PRODUKTÓW
const roleAuth = require('../middleware/role-auth'); // 🔒 KONTROLA RÓL
const validators = require('../middleware/validators'); // 🔒 WALIDACJA DANYCH

// ========== WSZYSTKIE OPERACJE NA TORBÁCH WYMAGAJĄ AUTORYZACJI ==========
router.get('/get-all-bags', checkAuth, bagsController.getAllBags); // 🔒 Lista wszystkich toreb
router.post('/insert-bags', checkAuth, bagsController.insertManyBags); // 🔒 Masowe dodawanie toreb
router.post('/update-many-bags', checkAuth, bagsController.updateManyBags); // 🔒 Masowa aktualizacja toreb
router.patch('/update-bags/:id', checkAuth, bagsController.updateBags); // 🔒 Aktualizacja pojedynczej torby
router.delete('/delete-bags/:id', 
    validators.mongoIdValidation,
    validators.handleValidationErrors,
    checkAuth, 
    historyLogger('bags'), 
    bagsController.deleteBags
); // 🔒 Usuwanie pojedynczej torby z walidacją
router.delete('/delete-all-bags', 
    checkAuth, 
    roleAuth.adminOnly(), 
    historyLogger('bags'), 
    bagsController.deleteAllBags
); // 🔒🔒🔒 TYLKO ADMIN: Usuń wszystkie torby

module.exports = router;
