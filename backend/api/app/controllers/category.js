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
                    categories: categories.map(category => ({
                        _id: category._id,
                        Kat_1_Kod_1: category.Kat_1_Kod_1,
                        Kat_1_Opis_1: category.Kat_1_Opis_1,
                        Plec: category.Plec,
                        request: {
                            type: 'GET',
                            url: `${config.domain}/api/excel/category/${category._id}`
                        }
                    }))
                };
                res.status(200).json(response);
            })
            .catch(err => {
                res.status(500).json({ error: { message: err.message } });
            });
    }

    insertManyCategories(req, res, next) {
        const categories = req.body;

        const katKodSet = new Set();
        for (const category of categories) {
            if (katKodSet.has(category.Kat_1_Kod_1)) {
                return res.status(400).json({
                    error: { message: 'Duplicate Kat_1_Kod_1 values in request body' }
                });
            }
            katKodSet.add(category.Kat_1_Kod_1);
        }

        Category.insertMany(categories)
            .then(result => {
                res.status(201).json({ message: 'Categories inserted', categories: result });
            })
            .catch(err => {
                if (err.code === 11000) {
                    res.status(400).json({ error: { message: 'Duplicate Kat_1_Kod_1 values' } });
                } else {
                    res.status(500).json({ error: { message: err.message } });
                }
            });
    }

    deleteAllCategories(req, res, next) {
        Category.deleteMany()
            .then(() => res.status(200).json({ message: 'All categories deleted' }))
            .catch(err => res.status(500).json({ error: { message: err.message } }));
    }

    getCategoryById(req, res, next) {
        const id = req.params.categoryId;
        Category.findById(id)
            .select('_id Kat_1_Kod_1 Kat_1_Opis_1 Plec')
            .then(category => {
                if (category) {
                    res.status(200).json({
                        category,
                        request: { type: 'GET', url: `${config.domain}/api/excel/category/get-all-categories` }
                    });
                } else {
                    res.status(404).json({ error: { message: 'Category not found' } });
                }
            })
            .catch(err => res.status(500).json({ error: { message: err.message } }));
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
            .then(() => res.status(200).json({
                message: 'Category updated',
                request: { type: 'GET', url: `${config.domain}/api/excel/category/${id}` }
            }))
            .catch(err => res.status(500).json({ error: { message: err.message } }));
    }
}

module.exports = new CategoryController();
