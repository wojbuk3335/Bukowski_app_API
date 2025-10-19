const Deduction = require('../db/models/deduction');

class DeductionController {
    // Create a new deduction
    createDeduction = async (req, res) => {
        try {
            const deduction = new Deduction(req.body);
            await deduction.save();
            res.status(201).json(deduction);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    };

    // Get all deductions
    getDeductions = async (req, res) => {
        try {
            const deductions = await Deduction.find();
            res.status(200).json(deductions);
        } catch (error) {
            res.status(500).json({ error: error.message });
        } 
    };

    // Get deduction by ID
    getDeductionById = async (req, res) => {
        try {
            const deduction = await Deduction.findById(req.params.id);
            if (!deduction) {
                return res.status(404).json({ message: 'Deduction not found' });
            }
            res.status(200).json(deduction);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    };

    // Update deduction
    updateDeduction = async (req, res) => {
        try {
            const deduction = await Deduction.findByIdAndUpdate(req.params.id, req.body, { new: true });
            if (!deduction) {
                return res.status(404).json({ message: 'Deduction not found' });
            }
            res.status(200).json(deduction);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    };

    // Delete deduction
    deleteDeduction = async (req, res) => {
        try {
            const deduction = await Deduction.findByIdAndDelete(req.params.id);
            if (!deduction) {
                return res.status(404).json({ message: 'Deduction not found' });
            }
            res.status(200).json({ message: 'Deduction deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    };

    // Delete all deductions
    deleteAllDeductions = async (req, res) => {
        try {
            await Deduction.deleteMany({});
            res.status(200).json({ message: 'All deductions deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    };

    // Get deductions by user symbol
    getDeductionsByUser = async (req, res) => {
        try {
            const deductions = await Deduction.find({ userSymbol: req.params.userSymbol });
            res.status(200).json(deductions);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    };
}

module.exports = new DeductionController();
