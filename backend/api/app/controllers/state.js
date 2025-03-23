const mongoose = require('mongoose');
const State = require('../db/models/state');

class StateController {
    addState(req, res, next) {
        console.log('Request received');
        const { fullName, date, sellingPoint, barcode, size } = req.body;

        if (!fullName || !date || !sellingPoint || !barcode || !size) {
            return res.status(400).json({
                message: 'Full name, date, selling point, barcode, and size are required'
            });
        }

        const state = new State({
            _id: new mongoose.Types.ObjectId(),
            fullName,
            date,
            sellingPoint,
            barcode,
            size
        });

        state.save()
            .then(result => {
                res.status(201).json({
                    message: 'State added',
                    createdState: {
                        _id: result._id,
                        fullName: result.fullName,
                        date: result.date,
                        sellingPoint: result.sellingPoint,
                        barcode: result.barcode,
                        size: result.size
                    }
                });
            })
            .catch(err => {
                console.error('Error adding state:', err);
                res.status(500).json({
                    error: err
                });
            });
    }

    getAllStates(req, res, next) {
        State.find()
            .select('_id fullName date sellingPoint barcode size') // Include size
            .exec()
            .then(docs => {
                const response = {
                    count: docs.length,
                    states: docs.map(doc => {
                        return {
                            _id: doc._id,
                            fullName: doc.fullName,
                            date: doc.date,
                            sellingPoint: doc.sellingPoint,
                            barcode: doc.barcode,
                            size: doc.size
                        };
                    })
                };
                res.status(200).json(response);
            })
            .catch(err => {
                res.status(500).json({
                    error: err
                });
            });
    }

    getStateById(req, res, next) {
        const id = req.params.stateId;
        State.findById(id)
            .select('_id fullName')
            .exec()
            .then(doc => {
                if (doc) {
                    res.status(200).json({
                        state: doc
                    });
                } else {
                    res.status(404).json({
                        message: 'No valid entry found for provided ID'
                    });
                }
            })
            .catch(err => {
                res.status(500).json({
                    error: err
                });
            });
    }

    updateState(req, res, next) {
        const id = req.params.stateId;

        // Validate stateId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid state ID' });
        }

        const updateOps = req.body;

        // Validate update fields
        const allowedFields = ['fullName', 'date', 'sellingPoint', 'size', 'barcode'];
        const isValidUpdate = Object.keys(updateOps).every(key => allowedFields.includes(key));

        if (!isValidUpdate) {
            return res.status(400).json({ message: 'Invalid fields in update request' });
        }

        State.updateOne({ _id: id }, { $set: updateOps })
            .exec()
            .then(result => {
                console.log('Update Result:', result); // Log the result for debugging
                if (result.matchedCount === 0) {
                    return res.status(404).json({ message: 'No state found with the provided ID' });
                }
                if (result.modifiedCount === 0) {
                    return res.status(200).json({ message: 'No changes were made to the state' });
                }
                res.status(200).json({ message: 'State updated successfully' });
            })
            .catch(err => {
                console.error('Error updating state:', err);
                res.status(500).json({ error: err });
            });
    }

    deleteState(req, res, next) {
        const id = req.params.stateId;
        State.deleteOne({ _id: id })
            .exec()
            .then(result => {
                if (result.deletedCount > 0) {
                    res.status(200).json({
                        message: 'State deleted successfully'
                    });
                } else {
                    res.status(404).json({
                        message: 'No state found with the provided ID'
                    });
                }
            })
            .catch(err => {
                console.error('Error deleting state:', err);
                res.status(500).json({
                    error: err
                });
            });
    }
}

module.exports = new StateController();