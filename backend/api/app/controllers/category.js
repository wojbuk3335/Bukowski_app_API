const Category = require('../db/models/category');
const mongoose = require('mongoose');
const config = require('../config');

class CategoriesController {
    getAllCategories(req, res, next) {
        Category.find()
            .select('_id Kat_Kod Kat_Opis')
            .then(categories => {
                const response = {
                    count: categories.length,
                    categories: categories.map(category => {
                        return {
                            _id: category._id,
                            Kat_Kod: category.Kat_Kod,
                            Kat_Opis: category.Kat_Opis,
                            request: {
                                type: 'GET',
                                url: `${config.domain}/api/excel/category/${category._id}`
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

    insertManyCategories(req, res, next) {
        const categories = req.body;
    
        // Check for duplicate Kat_Kod values in the request body
        const katKodSet = new Set();
        for (const category of categories) {
            if (katKodSet.has(category.Kat_Kod)) {
                return res.status(400).json({
                    error: {
                        message: 'Zduplikowane wartości Kat_Kod w treści żądania'
                    }
                });
            }
            katKodSet.add(category.Kat_Kod);
        }
    
        // Proceed to insert the categories
        Category.insertMany(categories)
            .then(result => {
                res.status(201).json({
                    message: 'Kategorie zostały dodane',
                    categories: result
                });
            })
            .catch(err => {
                if (err.code === 11000) { // Duplicate key error
                    res.status(400).json({
                        error: {
                            message: 'Zduplikowane wartości Kat_Kod'
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

    deleteAllCategories(req, res, next) {
        Category.deleteMany()
            .then(result => {
                res.status(200).json({
                    message: 'Wszystkie kategorie zostały usunięte'
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

    getCategoryById(req, res, next) {
        const id = req.params.categoryId;
        Category.findById(id)
            .select('_id Kat_Kod Kat_Opis')
            .then(category => {
                if (category) {
                    res.status(200).json({
                        category: category,
                        request: {
                            type: 'GET',
                            url: `${config.domain}/api/excel/category/get-all-categories`
                        }
                    });
                } else {
                    res.status(404).json({
                        error: {
                            message: 'Kategoria nie znaleziona'
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

    updateCategoryById(req, res, next) {
        const id = req.params.categoryId;
        const updateOps = {};
        for (const key in req.body) {
            if (req.body.hasOwnProperty(key)) {
                updateOps[key] = req.body[key];
            }
        }
        Category.findByIdAndUpdate(id, { $set: updateOps }, { new: true })
            .then(result => {
                res.status(200).json({
                    message: 'Kategoria zaktualizowana',
                    request: {
                        type: 'GET',
                        url: `${config.domain}/api/excel/category/${id}`
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

module.exports = new CategoriesController();
