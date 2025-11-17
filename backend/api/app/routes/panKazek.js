const express = require('express');
const router = express.Router();
const PanKazekController = require('../controllers/panKazekController');
const checkAuth = require('../middleware/check-auth');

// POST /api/pan-kazek - Add product to Pan Kazek list
router.post('/', checkAuth, PanKazekController.addProduct);

// GET /api/pan-kazek - Get all Pan Kazek products
router.get('/', checkAuth, PanKazekController.getAllProducts);

// GET /api/pan-kazek/months - Get available months
router.get('/months', checkAuth, PanKazekController.getAvailableMonths);

// POST /api/pan-kazek/pay-all - Pay all pending products
router.post('/pay-all', checkAuth, PanKazekController.payAllProducts);

// DELETE /api/pan-kazek/:id - Remove product from Pan Kazek list
router.delete('/:id', checkAuth, PanKazekController.removeProduct);

module.exports = router;