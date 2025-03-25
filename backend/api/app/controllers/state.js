const State = require('../db/models/state'); // Adjusted to use the correct model
const mongoose = require('mongoose');
const config = require('../config');

class StatesController {
    // Get all states
    async getAllStates(req, res, next) {
        try {
            const states = await State.find();
            res.status(200).json(states);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Create a new state
    async createState(req, res, next) {
        try {
            const state = new State({
                _id: new mongoose.Types.ObjectId(),
                fullName: req.body.fullName,
            });
            const result = await state.save();
            res.status(201).json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Get a state by ID
    async getStateById(req, res, next) {
        try {
            const state = await State.findById(req.params.id);
            if (!state) {
                return res.status(404).json({ message: 'State not found' });
            }
            res.status(200).json(state);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Update a state by ID
    async updateState(req, res, next) {
        try {
            const updatedState = await State.findByIdAndUpdate(
                req.params.id,
                { fullName: req.body.fullName },
                { new: true }
            );
            if (!updatedState) {
                return res.status(404).json({ message: 'State not found' });
            }
            res.status(200).json(updatedState);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Delete a state by ID
    async deleteState(req, res, next) {
        try {
            const deletedState = await State.findByIdAndDelete(req.params.id);
            if (!deletedState) {
                return res.status(404).json({ message: 'State not found' });
            }
            res.status(200).json({ message: 'State deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new StatesController();