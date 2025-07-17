const express = require('express');
const router = express.Router();
const deductionController = require('../controllers/deductions');

// Test API route
router.get('/test', (req, res) => {
    res.status(200).json({ message: 'Deductions API is working!' });
});

// Deduction API routes
router.post('/', deductionController.createDeduction);
router.get('/', deductionController.getDeductions);
router.get('/:id', deductionController.getDeductionById);
router.put('/:id', deductionController.updateDeduction);
router.delete('/all', deductionController.deleteAllDeductions); // Define this route first
router.delete('/:id', deductionController.deleteDeduction);
router.get('/user/:userSymbol', deductionController.getDeductionsByUser); // Get deductions by user

module.exports = router;
