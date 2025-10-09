const SubcategoryCoats = require('../db/models/subcategoryCoats'); // Używamy dedykowanego modelu subcategoryCoats
const mongoose = require('mongoose');
const config = require('../config');

class SubcategoryCoatsController {
    getAllSubcategoryCoats(req, res, next) {
        SubcategoryCoats.find()
            .select('_id Kat_1_Kod_1 Kat_1_Opis_1 Plec')
            .then(categories => {
                const response = {
                    count: categories.length,
                    subcategoryCoats: categories.map(category => ({
                        _id: category._id,
                        Kat_1_Kod_1: category.Kat_1_Kod_1,
                        Kat_1_Opis_1: category.Kat_1_Opis_1,
                        Plec: category.Plec,
                        request: {
                            type: 'GET',
                            url: `${config.domain}/api/subcategoryCoats/${category._id}`
                        }
                    }))
                };
                res.status(200).json(response);
            })
            .catch(err => {
                res.status(500).json({ error: { message: err.message } });
            });
    }

    insertManySubcategoryCoats(req, res, next) {
        const subcategoryCoats = req.body;

        const katKodSet = new Set();
        for (const subcategory of subcategoryCoats) {
            if (katKodSet.has(subcategory.Kat_1_Kod_1)) {
                return res.status(400).json({
                    error: { message: 'Duplicate Kat_1_Kod_1 values in request body' }
                });
            }
            katKodSet.add(subcategory.Kat_1_Kod_1);
        }

        SubcategoryCoats.insertMany(subcategoryCoats)
            .then(result => {
                res.status(201).json({ message: 'Subcategory coats inserted', subcategoryCoats: result });
            })
            .catch(err => {
                if (err.code === 11000) {
                    res.status(400).json({ error: { message: 'Duplicate Kat_1_Kod_1 values' } });
                } else {
                    res.status(500).json({ error: { message: err.message } });
                }
            });
    }

    deleteAllSubcategoryCoats(req, res, next) {
        SubcategoryCoats.deleteMany({})
            .then(result => {
                res.status(200).json({
                    message: 'All subcategory coats deleted',
                    deletedCount: result.deletedCount
                });
            })
            .catch(err => {
                res.status(500).json({ error: { message: err.message } });
            });
    }

    getSubcategoryCcoatsById(req, res, next) {
        const id = req.params.subcategoryCoatsId;
        SubcategoryCoats.findById(id)
            .select('_id Kat_1_Kod_1 Kat_1_Opis_1 Plec')
            .then(subcategory => {
                if (subcategory) {
                    res.status(200).json({
                        subcategoryCoats: subcategory,
                        request: {
                            type: 'GET',
                            description: 'Get all subcategory coats',
                            url: `${config.domain}/api/subcategoryCoats/get-all-subcategoryCoats`
                        }
                    });
                } else {
                    res.status(404).json({ message: 'Subcategory coats not found' });
                }
            })
            .catch(err => {
                res.status(500).json({ error: { message: err.message } });
            });
    }

    updateSubcategoryCoatsById(req, res, next) {
        const id = req.params.subcategoryCoatsId;
        const updateOps = {};
        for (const key in req.body) {
            if (req.body.hasOwnProperty(key)) {
                updateOps[key] = req.body[key];
            }
        }
        SubcategoryCoats.findByIdAndUpdate(id, { $set: updateOps }, { new: true })
            .then(() => res.status(200).json({
                message: 'Subcategory coats updated',
                request: { type: 'GET', url: `${config.domain}/api/subcategoryCoats/${id}` }
            }))
            .catch(err => res.status(500).json({ error: { message: err.message } }));
    }
}

module.exports = new SubcategoryCoatsController();