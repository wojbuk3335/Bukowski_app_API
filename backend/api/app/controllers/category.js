const Category = require('../db/models/category');
const mongoose = require('mongoose');
const config = require('../config');

class CategoryController {
    getAllCategories(req, res, next) {
        Category.find()
            .select('_id Kat_1_Kod_1 Kat_1_Opis_1 Plec')
            .then(categories => {
                const response = {
                    count: categories.length,
                    categories: categories.map(category => {
                        return {
                            _id: category._id,
                            Kat_1_Kod_1: category.Kat_1_Kod_1,
                            Kat_1_Opis_1: category.Kat_1_Opis_1,
                            Plec: category.Plec,
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

        // Validate that no Kat_1_Kod_1 values are null
        for (const category of categories) {
            if (!category.Kat_1_Kod_1) {
                return res.status(400).json({
                    error: {
                        message: 'Kat_1_Kod_1 cannot be null or undefined'
                    }
                });
            }
        }

        // Validate that no Kat_1_Opis_1 values are null
        for (const category of categories) {
            if (!category.Kat_1_Opis_1) {
                return res.status(400).json({
                    error: {
                        message: 'Kat_1_Opis_1 cannot be null or undefined'
                    }
                });
            }
        }

        // Extract Kat_1_Kod_1 values from the request body
        const kodValues = categories.map(category => category.Kat_1_Kod_1);

        // Extract Kat_1_Opis_1 values from the request body
        const opisValues = categories.map(category => category.Kat_1_Opis_1);

        // Check for existing Kat_1_Kod_1 values in the database
        Category.find({ Kat_1_Kod_1: { $in: kodValues } })
            .then(existingCategories => {
                if (existingCategories.length > 0) {
                    return res.status(400).json({
                        error: {
                            message: 'Duplicate Kat_1_Kod_1 values in database',
                            duplicates: existingCategories.map(cat => cat.Kat_1_Kod_1)
                        }
                    });
                }

                // Check for existing Kat_1_Opis_1 values in the database
                return Category.find({ Kat_1_Opis_1: { $in: opisValues } })
                    .then(existingCategories => {
                        if (existingCategories.length > 0) {
                            return res.status(400).json({
                                error: {
                                    message: 'Duplicate Kat_1_Opis_1 values in database',
                                    duplicates: existingCategories.map(cat => cat.Kat_1_Opis_1)
                                }
                            });
                        }

                        // Proceed to insert the categories
                        return Category.insertMany(categories)
                            .then(result => {
                                res.status(201).json({
                                    message: 'Categories inserted',
                                    categories: result
                                });
                            });
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

    deleteAllCategories(req, res, next) {
        Category.deleteMany()
            .then(result => {
                res.status(200).json({
                    message: 'All categories deleted'
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
            .select('_id Kat_1_Kod_1 Kat_1_Opis_1 Plec')
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
                            message: 'Category not found'
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

        // Check if the updated Kat_1_Opis_1 is unique
        if (updateOps.Kat_1_Opis_1) {
            Category.findOne({ Kat_1_Opis_1: updateOps.Kat_1_Opis_1, _id: { $ne: id } })
                .then(existingCategory => {
                    if (existingCategory) {
                        return res.status(400).json({
                            error: {
                                message: `Kat_1_Opis_1 "${updateOps.Kat_1_Opis_1}" already exists. Please use a unique value.`
                            }
                        });
                    }

                    // Proceed with the update
                    return Category.findByIdAndUpdate(id, { $set: updateOps }, { new: true })
                        .then(result => {
                            res.status(200).json({
                                message: 'Category updated',
                                request: {
                                    type: 'GET',
                                    url: `${config.domain}/api/excel/category/${id}`
                                }
                            });
                        });
                })
                .catch(err => {
                    res.status(500).json({
                        error: {
                            message: err.message
                        }
                    });
                });
        } else {
            // Proceed with the update if Kat_1_Opis_1 is not being modified
            Category.findByIdAndUpdate(id, { $set: updateOps }, { new: true })
                .then(result => {
                    res.status(200).json({
                        message: 'Category updated',
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
}

module.exports = new CategoryController();
