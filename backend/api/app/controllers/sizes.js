const Size = require('../db/models/size');
const mongoose = require('mongoose');
const config = require('../config');

class SizesController {
    getAllSizes(req, res, next) {
        Size.find()
            .select('_id Roz_Kod Roz_Opis')
            .then(sizes => {
                const response = {
                    count: sizes.length,
                    sizes: sizes.map(size => {
                        return {
                            _id: size._id,
                            Roz_Kod: size.Roz_Kod,
                            Roz_Opis: size.Roz_Opis,
                            request: {
                                type: 'GET',
                                url: `${config.domain}/api/excel/size/${size._id}`
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

    insertManySizes(req, res, next) {
        const sizes = req.body;
    
        // Check for duplicate Roz_Kod values in the request body
        const rozKodSet = new Set();
        for (const size of sizes) {
            if (rozKodSet.has(size.Roz_Kod)) {
                return res.status(400).json({
                    error: {
                        message: 'Duplicate Roz_Kod values in request body'
                    }
                });
            }
            rozKodSet.add(size.Roz_Kod);
        }
    
        // Proceed to insert the sizes
        Size.insertMany(sizes)
            .then(result => {
                res.status(201).json({
                    message: 'Sizes inserted',
                    sizes: result
                });
            })
            .catch(err => {
                if (err.code === 11000) { // Duplicate key error
                    res.status(400).json({
                        error: {
                            message: 'Duplicate Roz_Kod values'
                        }
                    });
                } else {
                    res.status(500).json({
                        error: {
                            message: err.message
                        }
                    });
                }
            });
    }

    deleteAllSizes(req, res, next) {
        Size.deleteMany()
            .then(result => {
                res.status(200).json({
                    message: 'All sizes deleted'
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

    getSizeById(req, res, next) {
        const id = req.params.sizeId;
        Size.findById(id)
            .select('_id Roz_Kod Roz_Opis')
            .then(size => {
                if (size) {
                    res.status(200).json({
                        size: size,
                        request: {
                            type: 'GET',
                            url: `${config.domain}/api/excel/size/get-all-sizes`
                        }
                    });
                } else {
                    res.status(404).json({
                        error: {
                            message: 'Size not found'
                        }
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

    updateSizeById(req, res, next) {
        const id = req.params.sizeId;
        const updateOps = {};
        for (const key in req.body) {
            if (req.body.hasOwnProperty(key)) {
                updateOps[key] = req.body[key];
            }
        }
        Size.findByIdAndUpdate(id, { $set: updateOps }, { new: true })
            .then(result => {
                res.status(200).json({
                    message: 'Size updated',
                    request: {
                        type: 'GET',
                        url: `${config.domain}/api/excel/size/${id}`
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

module.exports = new SizesController();