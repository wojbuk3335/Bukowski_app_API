const Color = require('../db/models/color');
const mongoose = require('mongoose');

class ColorsController {
    getAllColors(req, res, next) {
        Color.find()
            .select('_id Kol_Kod Kol_Opis')
            .then(colors => {
                const response = {
                    count: colors.length,
                    colors: colors.map(color => {
                        return {
                            _id: color._id,
                            Kol_Kod: color.Kol_Kod,
                            Kol_Opis: color.Kol_Opis,
                            request: {
                                type: 'GET',
                                url: 'http://localhost:3000/api/excel/color/' + color._id
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

    insertManyColors(req, res, next) {
        const colors = req.body;
    
        // Check for duplicate Kol_Kod values in the request body
        const kolKodSet = new Set();
        for (const color of colors) {
            if (kolKodSet.has(color.Kol_Kod)) {
                return res.status(400).json({
                    error: {
                        message: 'Duplicate Kol_Kod values in request body'
                    }
                });
            }
            kolKodSet.add(color.Kol_Kod);
        }
    
        // Proceed to insert the colors
        Color.insertMany(colors)
            .then(result => {
                res.status(201).json({
                    message: 'Colors inserted',
                    colors: result
                });
            })
            .catch(err => {
                if (err.code === 11000) { // Duplicate key error
                    res.status(400).json({
                        error: {
                            message: 'Duplicate Kol_Kod values'
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

    //deleteAllColors
    deleteAllColors(req, res, next) {
        Color.deleteMany()
            .then(result => {
                res.status(200).json({
                    message: 'All colors deleted'
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

    //getColorById
    getColorById(req, res, next) {
        const id = req.params.colorId;
        Color.findById(id)
            .select('_id Kol_Kod Kol_Opis')
            .then(color => {
                if (color) {
                    res.status(200).json({
                        color: color,
                        request: {
                            type: 'GET',
                            url: 'http://localhost:3000/api/excel/color/get-all-colors'
                        }
                    });
                } else {
                    res.status(404).json({
                        error: {
                            message: 'Color not found'
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

    //updateColorById
    updateColorById(req, res, next) {
        const id = req.params.colorId;
        const updateOps = {};
        for (const key in req.body) {
            if (req.body.hasOwnProperty(key)) {
                updateOps[key] = req.body[key];
            }
        }
        Color.findByIdAndUpdate(id, { $set: updateOps }, { new: true })
            .then(result => {
                res.status(200).json({
                    message: 'Color updated',
                    request: {
                        type: 'GET',
                        url: 'http://localhost:3000/api/excel/color/' + id
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

module.exports = new ColorsController();