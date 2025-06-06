const Jacket = require('./../db/models/jacket');
const mongoose = require('mongoose');
const config = require('../config');

class JacketsController {
    getAllJackets(req, res, next) {
        Jacket.find()
            .select('_id name nameID color colorID size sizeID currentStall currentStallID dateOfAdd defaultPriceKrupowki defaultPriceGubalowka defaultPriceKarpacz')
            .then(jackets => {
                const response = {
                    count: jackets.length,
                    jackets: jackets.map(jacket => {
                        return {
                            _id: jacket._id,
                            name: jacket.name,
                            nameID: jacket.nameID,
                            color: jacket.color,
                            colorID: jacket.colorID,
                            size: jacket.size,
                            sizeID: jacket.sizeID,
                            currentStall: jacket.currentStall,
                            currentStallID: jacket.currentStallID,
                            dateOfAdd: jacket.dateOfAdd,
                            defaultPriceKrupowki: jacket.defaultPriceKrupowki,
                            defaultPriceGubalowka: jacket.defaultPriceGubalowka,
                            defaultPriceKarpacz: jacket.defaultPriceKarpacz,
                            request: {
                                type: 'GET',
                                url: `${config.domain}/jackets/${jacket._id}`
                            }
                        };
                    })
                };
                res.status(200).json(response);
            })
            .catch(err => {
                res.status(500).json({
                    error: {
                        message: err.message
                    }
                });
            });
    }

    createJacket(req, res, next) {
        const jacket = new Jacket({
            _id: new mongoose.Types.ObjectId(),
            name: req.body.name,
            nameID: req.body.nameID,
            color: req.body.color,
            colorID: req.body.colorID,
            size: req.body.size,
            sizeID: req.body.sizeID,
            currentStall: req.body.currentStall,
            currentStallID: req.body.currentStallID,
            dateOfAdd: req.body.dateOfAdd,
            defaultPrice: req.body.defaultPrice,
            defaultPriceKarpacz: req.body.defaultPriceKarpacz,
            defaultPriceGubalowka: req.body.defaultPriceGubalowka,
            defaultPriceKrupowki: req.body.defaultPriceKrupowki
        });
        jacket.save()
            .then(result => {
                res.status(201).json({
                    message: 'Jacket created successfully',
                    createdJacket: {
                        _id: result._id,
                        name: result.name,
                        nameID: result.nameID,
                        color: result.color,
                        colorID: result.colorID,
                        size: result.size,
                        sizeID: result.sizeID,
                        currentStall: result.currentStall,
                        currentStallID: result.currentStallID,
                        dateOfAdd: result.dateOfAdd,
                        defaultPrice: result.defaultPrice,
                        request: {
                            type: 'GET',
                            url: `${config.domain}/jackets/${result._id}`
                        }
                    }
                });
            })
            .catch(err => {
                res.status(500).json({
                    error: {
                        message: err.message
                    }
                });
            });
    }

    getOneJacket(req, res, next) {
        const id = req.params.jacketId;
        Jacket.findById(id)
            .select('_id name nameID color colorID size sizeID currentStall currentStallID dateOfAdd defaultPriceKrupowki defaultPriceGubalowka defaultPriceKarpacz')
            .then(jacket => {
                if (jacket) {
                    res.status(200).json({
                        jacket: jacket,
                        request: {
                            type: 'GET',
                            description: 'Get all jackets',
                            url: `${config.domain}/jackets`
                        }
                    });
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
    }

    updateJacket(req, res, next) {
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
                    message: 'Jacket updated',
                    request: {
                        type: 'GET',
                        url: `${config.domain}/jackets/${id}`
                    }
                });
            })
            .catch(err => {
                res.status(500).json({
                    error: {
                        message: err.message
                    }
                });
            });
    }

    deleteJacket(req, res, next) {
        const id = req.params.jacketId;
        Jacket.deleteOne({ _id: id })
            .then(result => {
                res.status(200).json({
                    message: 'Jacket deleted',
                    request: {
                        type: 'POST',
                        url: `${config.domain}/jackets`,
                        body: {
                            name: { type: String, required: true },
                            nameID: { type: String, required: true },
                            color: { type: String, required: true },
                            colorID: { type: String, required: true },
                            size: { type: String, required: true },
                            sizeID: { type: String, required: true },
                            currentStall: { type: String, required: true },
                            currentStallID: { type: String, required: true },
                            dateOfAdd: { type: Date, required: true },
                            defaultPriceKrupowki: { type: Number, required: true },
                            defaultPriceGubalowka: { type: Number, required: true },
                            defaultPriceKarpacz: { type: Number, required: true }
                        }
                    }
                });
            })
            .catch(err => {
                res.status(500).json({
                    error: {
                        message: err.message
                    }
                });
            });
    }
}

module.exports = new JacketsController();