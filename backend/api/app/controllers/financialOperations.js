const FinancialOperation = require('../db/models/financialOperation');

class FinancialOperationController {
    // Create a new financial operation
    createFinancialOperation = async (req, res) => {
        try {
            const operation = new FinancialOperation(req.body);
            await operation.save();
            res.status(201).json(operation);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    };

    // Get all financial operations
    getFinancialOperations = async (req, res) => {
        try {
            const operations = await FinancialOperation.find();
            res.status(200).json(operations);
        } catch (error) {
            res.status(500).json({ error: error.message });
        } 
    };

    // Get financial operation by ID
    getFinancialOperationById = async (req, res) => {
        try {
            const operation = await FinancialOperation.findById(req.params.id);
            if (!operation) {
                return res.status(404).json({ message: 'Financial operation not found' });
            }
            res.status(200).json(operation);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    };

    // Update financial operation
    updateFinancialOperation = async (req, res) => {
        try {
            const operation = await FinancialOperation.findByIdAndUpdate(req.params.id, req.body, { new: true });
            if (!operation) {
                return res.status(404).json({ message: 'Financial operation not found' });
            }
            res.status(200).json(operation);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    };

    // Delete financial operation
    deleteFinancialOperation = async (req, res) => {
        try {
            const operation = await FinancialOperation.findByIdAndDelete(req.params.id);
            if (!operation) {
                return res.status(404).json({ message: 'Financial operation not found' });
            }
            res.status(200).json({ message: 'Financial operation deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    };

    // Delete all financial operations
    deleteAllFinancialOperations = async (req, res) => {
        try {
            await FinancialOperation.deleteMany({});
            res.status(200).json({ message: 'All financial operations deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    };

    // Get financial operations by user symbol
    getFinancialOperationsByUser = async (req, res) => {
        try {
            const operations = await FinancialOperation.find({ userSymbol: req.params.userSymbol });
            res.status(200).json(operations);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    };

    // Get financial operations by type
    getFinancialOperationsByType = async (req, res) => {
        try {
            const operations = await FinancialOperation.find({ type: req.params.type });
            res.status(200).json(operations);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    };
}

module.exports = new FinancialOperationController();