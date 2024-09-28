const express = require('express');
const router = express.Router();
const Jacket = require('../db/models/jacket');
const mongoose = require('mongoose');

// Get all jackets
router.get('/', (req, res, next) => {
    Jacket.find()
        .then(jackets => {
            res.status(200).json(jackets);
        })
        .catch(err => {
            res.status(500).json({
                error: {
                    message: err.message
                }
            });
        });
});

// Create a jacket
router.post('/', (req, res, next) => {
    const jacket = new Jacket({
        _id: new mongoose.Types.ObjectId(),
        name: req.body.name,
        price: req.body.price
    });
    jacket.save()
        .then(result => {
            res.status(201).json({
                message: 'Jacket created successfully',
                createdJacket: result
            });
        })
        .catch(err => {
            res.status(500).json({
                error: {
                    message: err.message
                }
            });
        });
});

// Get one jacket
router.get('/:jacketId', (req, res, next) => {
    const id = req.params.jacketId;
        Jacket.findById(id)
        .then(jacket => {
            console.log(jacket);
            if(jacket) {
                res.status(200).json(jacket);
            } else {
                res.status(404).json({
                    message: 'No valid entry found for provided ID'
                });
            }
        })
        .catch(err => {
            res.status(500).json({
                error: {
                    message: err.message
                }
            });
        });
});


// Update a jacket
router.patch('/:jacketId', (req, res, next) => {
    const id = req.params.jacketId;
    const updateOps = {};

    // Assuming req.body is an object with key-value pairs
    for (const key in req.body) {
        if (req.body.hasOwnProperty(key)) {
            updateOps[key] = req.body[key];
        }
    }

    Jacket.updateOne({ _id: id }, { $set: updateOps })
        .then(result => {
            res.status(200).json({
                message: 'Jacket updated'
            });
        })
        .catch(err => {
            res.status(500).json({
                error: {
                    message: err.message
                }
            });
        });
});


// Delete a jacket
router.delete('/:jacketId', (req, res, next) => {
    const id = req.params.jacketId;
    Jacket.deleteOne({ _id: id })
        .then(result => {
            res.status(200).json({
                message: 'Jacket deleted'
            });
        })
        .catch(err => {
            res.status(500).json({
                error: {
                    message: err.message
                }
            });
        });
});

module.exports = router;