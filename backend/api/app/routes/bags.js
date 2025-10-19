const express = require('express');
const router = express.Router();
const bagsController = require('../controllers/bags');
const historyLogger = require('../middleware/historyLogger');
const checkAuth = require('../middleware/check-auth'); // 🔒 TORBY - ZABEZPIECZENIE PRODUKTÓW

// ========== WSZYSTKIE OPERACJE NA TORBÁCH WYMAGAJĄ AUTORYZACJI ==========
router.get('/get-all-bags', checkAuth, bagsController.getAllBags); // 🔒 Lista wszystkich toreb
router.post('/insert-bags', checkAuth, bagsController.insertManyBags); // 🔒 Masowe dodawanie toreb
router.post('/update-many-bags', checkAuth, bagsController.updateManyBags); // 🔒 Masowa aktualizacja toreb
router.patch('/update-bags/:id', checkAuth, bagsController.updateBags); // 🔒 Aktualizacja pojedynczej torby
router.delete('/delete-bags/:id', checkAuth, historyLogger('bags'), bagsController.deleteBags); // 🔒 Usuwanie pojedynczej torby
router.delete('/delete-all-bags', checkAuth, historyLogger('bags'), bagsController.deleteAllBags); // 🔒 NIEBEZPIECZNE: Usuń wszystkie torby

module.exports = router;
