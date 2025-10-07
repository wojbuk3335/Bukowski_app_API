const express = require('express');
const router = express.Router();
const remainingProductsController = require('../controllers/remainingProducts');
const historyLogger = require('../middleware/historyLogger');

// Get all remaining products
router.get('/get-all-remaining-products', remainingProductsController.getAllRemainingProducts);

// Insert many remaining products
router.post('/insert-remaining-products', remainingProductsController.insertManyRemainingProducts);

// Update many remaining products
router.post('/update-many-remaining-products', remainingProductsController.updateManyRemainingProducts);

// Update single remaining product
router.patch('/update-remaining-products/:id', remainingProductsController.updateRemainingProducts);

// Delete single remaining product
router.delete('/delete-remaining-products/:id', historyLogger('remainingProducts'), remainingProductsController.deleteRemainingProducts);

// Delete all remaining products
router.delete('/delete-all-remaining-products', historyLogger('remainingProducts'), remainingProductsController.deleteAllRemainingProducts);

module.exports = router;