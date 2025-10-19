const express = require('express');
const router = express.Router();
const remainingProductsController = require('../controllers/remainingProducts');
const historyLogger = require('../middleware/historyLogger');
const checkAuth = require('../middleware/check-auth'); // 🔒 POZOSTAŁE PRODUKTY - ZABEZPIECZENIE

// ========== WSZYSTKIE OPERACJE NA POZOSTAŁYCH PRODUKTACH WYMAGAJĄ AUTORYZACJI ==========
router.get('/get-all-remaining-products', checkAuth, remainingProductsController.getAllRemainingProducts); // 🔒 Lista pozostałych produktów
router.post('/insert-remaining-products', checkAuth, remainingProductsController.insertManyRemainingProducts); // 🔒 Masowe dodawanie
router.post('/update-many-remaining-products', checkAuth, remainingProductsController.updateManyRemainingProducts); // 🔒 Masowa aktualizacja
router.patch('/update-remaining-products/:id', checkAuth, remainingProductsController.updateRemainingProducts); // 🔒 Aktualizacja pojedynczego
router.delete('/delete-remaining-products/:id', checkAuth, historyLogger('remainingProducts'), remainingProductsController.deleteRemainingProducts); // 🔒 Usuwanie pojedynczego
router.delete('/delete-all-remaining-products', checkAuth, historyLogger('remainingProducts'), remainingProductsController.deleteAllRemainingProducts); // 🔒 Usuń wszystkie

module.exports = router;