const State = require('../db/models/state'); // Adjusted to use the correct model
const mongoose = require('mongoose');
const config = require('../config');
const Goods = require('../db/models/goods'); // Import Goods model
const Size = require('../db/models/size');   // Import Size model

// Corrected checksum calculation function
const calculateChecksum = (barcode) => {
    const digits = barcode.split('').map(Number);
    const sum = digits.reduce((acc, digit, index) => {
        return acc + (index % 2 === 0 ? digit : digit * 3); // Correct weights: 1 for odd, 3 for even
    }, 0);
    const checksum = (10 - (sum % 10)) % 10; // Ensure checksum is between 0-9
    return checksum;
};

class StatesController {
    // Get all states
    async getAllStates(req, res, next) {
        try {
            const states = await State.find()
                .populate('fullName', 'fullName') // Populate fullName with its value from Goods
                .populate('size', 'Roz_Opis');   // Populate size with its value from Size

            res.status(200).json(states.map(state => ({
                id: state._id,
                fullName: state.fullName.fullName,
                date: state.date,
                size: state.size.Roz_Opis,
                barcode: state.barcode // Include barcode in the response
            }))); // Fixed missing closing parenthesis
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Create a new state
    async createState(req, res, next) {
        try {
            // Find the ObjectId for fullName in Goods
            const goods = await Goods.findOne({ fullName: req.body.fullName });
            if (!goods) {
                return res.status(404).json({ message: 'Goods not found' });
            }

            // Find the ObjectId for size in Size
            const size = await Size.findOne({ Roz_Opis: req.body.size });
            if (!size) {
                return res.status(404).json({ message: 'Size not found' });
            }

            // Extract the code from Goods and update it with Roz_Kod
            let barcode = goods.code; // Assuming `code` is the field in Goods
            console.log(barcode)
            const rozKod = size.Roz_Kod; // Assuming `Roz_Kod` is the field in Size
            barcode = barcode.substring(0, 5) + rozKod + barcode.substring(8);

            // Corrected checksum calculation
            const checksum = calculateChecksum(barcode);
            barcode = barcode.substring(0, 12) + checksum; // Append checksum to barcode

            // Create a new State with the updated barcode
            const state = new State({
                _id: new mongoose.Types.ObjectId(),
                fullName: goods._id,
                date: req.body.date,
                size: size._id,
                barcode // Save the updated barcode
            });

            const newState = await state.save();
            res.status(201).json(newState);
        } catch (error) {
            res.status(400).json({ error: error.message });
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
    async updateStateById(req, res, next) {
        try {
            const goods = await Goods.findOne({ fullName: req.body.fullName });
            if (!goods) {
                return res.status(404).json({ message: 'Goods not found' });
            }

            const size = await Size.findOne({ Roz_Opis: req.body.size });
            if (!size) {
                return res.status(404).json({ message: 'Size not found' });
            }

            let barcode = goods.code; // Assuming `code` is the field in Goods
            const rozKod = size.Roz_Kod; // Assuming `Roz_Kod` is the field in Size
            barcode = barcode.substring(0, 5) + rozKod + barcode.substring(8);

            // Corrected checksum calculation
            const checksum = calculateChecksum(barcode);
            barcode = barcode.substring(0, 12) + checksum; // Append checksum to barcode

            // Update the State with the new data
            const updatedState = await State.findByIdAndUpdate(
                req.params.id,
                {
                    fullName: goods._id,
                    date: req.body.date,
                    size: size._id,
                    barcode // Save the updated barcode
                },
                { new: true } // Return the updated document
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

    // Get states formatted for a frontend table
    async getStatesForTable(req, res, next) {
        try {
            const states = await State.find()
                .populate('fullName', 'fullName') // Populate fullName with its value from Goods
                .populate('size', 'Roz_Opis');   // Populate size with its value from Size

            // Format the data for the table
            const tableData = states.map(state => ({
                id: state._id,
                fullName: state.fullName.fullName, // Extract the fullName value
                date: state.date,
                size: state.size.Roz_Opis         // Extract the size value
            }));

            res.status(200).json(tableData);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new StatesController();