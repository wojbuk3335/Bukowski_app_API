const Localization = require('../db/models/localization');
const mongoose = require('mongoose');
const config = require('../config');

class LocalizationController {
    getAllLocalizations(req, res, next) {
        Localization.find()
            .select('_id Miejsc_1_Kod_1 Miejsc_1_Opis_1')
            .then(localizations => {
                // Zwróć wszystkie lokalizacje, nawet te z pustym opisem
                const response = {
                    count: localizations.length,
                    localizations: localizations.map(localization => {
                        return {
                            _id: localization._id,
                            Miejsc_1_Kod_1: localization.Miejsc_1_Kod_1,
                            Miejsc_1_Opis_1: localization.Miejsc_1_Opis_1 || "", // Ustaw pusty string jeśli brak opisu
                            request: {
                                type: 'GET',
                                url: `${config.domain}/api/excel/localization/${localization._id}`
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

    insertManyLocalizations(req, res, next) {
        const localizations = req.body;

        // Check for duplicate Miejsc_1_Kod_1 values in the request body
        const miejscKodSet = new Set();
        for (const localization of localizations) {
            if (miejscKodSet.has(localization.Miejsc_1_Kod_1)) {
                return res.status(400).json({
                    error: {
                        message: 'Duplicate Miejsc_1_Kod_1 values in request body'
                    }
                });
            }
            miejscKodSet.add(localization.Miejsc_1_Kod_1);
        }

        // Proceed to insert the localizations
        Localization.insertMany(localizations)
            .then(result => {
                res.status(201).json({
                    message: 'Localizations inserted',
                    localizations: result
                });
            })
            .catch(err => {
                if (err.code === 11000) { // Duplicate key error
                    res.status(400).json({
                        error: {
                            message: 'Duplicate Miejsc_1_Kod_1 values'
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

    deleteAllLocalizations(req, res, next) {
        Localization.deleteMany()
            .then(result => {
                res.status(200).json({
                    message: 'All localizations deleted'
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

    getLocalizationById(req, res, next) {
        const id = req.params.localizationId;
        Localization.findById(id)
            .select('_id Miejsc_1_Kod_1 Miejsc_1_Opis_1')
            .then(localization => {
                if (localization) {
                    res.status(200).json({
                        localization: localization,
                        request: {
                            type: 'GET',
                            url: `${config.domain}/api/excel/localization/get-all-localizations`
                        }
                    });
                } else {
                    res.status(404).json({
                        error: {
                            message: 'Localization not found'
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

    updateLocalizationById(req, res, next) {
        const id = req.params.localizationId;
        const updateOps = {};
        for (const key in req.body) {
            if (req.body.hasOwnProperty(key)) {
                updateOps[key] = req.body[key];
            }
        }
        Localization.findByIdAndUpdate(id, { $set: updateOps }, { new: true })
            .then(result => {
                res.status(200).json({
                    message: 'Localization updated',
                    request: {
                        type: 'GET',
                        url: `${config.domain}/api/excel/localization/${id}`
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

module.exports = new LocalizationController();