const RemainingCategory = require('../db/models/remainingCategory');
const mongoose = require('mongoose');

class RemainingCategoryController {
    async getAllRemainingCategories(req, res, next) {
        RemainingCategory.find()
            .select('_id Rem_Kat_1_Kod_1 Rem_Kat_1_Opis_1 Plec number_id')
            .then(remainingCategories => {
                res.status(200).json({
                    count: remainingCategories.length,
                    remainingCategories: remainingCategories.map(remainingCategory => ({
                        _id: remainingCategory._id,
                        Rem_Kat_1_Kod_1: remainingCategory.Rem_Kat_1_Kod_1,
                        Rem_Kat_1_Opis_1: remainingCategory.Rem_Kat_1_Opis_1,
                        Plec: remainingCategory.Plec,
                        number_id: remainingCategory.number_id
                    }))
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

    async insertManyRemainingCategories(req, res, next) {
        const remainingCategoriesToInsert = req.body;

        if (!Array.isArray(remainingCategoriesToInsert) || remainingCategoriesToInsert.length === 0) {
            return res.status(400).json({ message: 'Invalid input: expected an array of remaining categories' });
        }

        const formattedRemainingCategories = remainingCategoriesToInsert.map(remainingCategory => ({
            _id: new mongoose.Types.ObjectId(),
            Rem_Kat_1_Kod_1: remainingCategory.Rem_Kat_1_Kod_1,
            Rem_Kat_1_Opis_1: remainingCategory.Rem_Kat_1_Opis_1 || '',
            Plec: remainingCategory.Plec || '',
            number_id: remainingCategory.number_id
        }));

        RemainingCategory.insertMany(formattedRemainingCategories)
            .then(result => {
                res.status(201).json({
                    message: 'Remaining categories created successfully',
                    count: result.length,
                    createdRemainingCategories: result
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

    async updateManyRemainingCategories(req, res, next) {
        try {
            const updatePromises = req.body.map(remainingCategory => {
                return RemainingCategory.findByIdAndUpdate(
                    remainingCategory._id,
                    { 
                        Rem_Kat_1_Kod_1: remainingCategory.Rem_Kat_1_Kod_1,
                        Rem_Kat_1_Opis_1: remainingCategory.Rem_Kat_1_Opis_1,
                        Plec: remainingCategory.Plec,
                        number_id: remainingCategory.number_id
                    },
                    { new: true }
                );
            });

            const results = await Promise.all(updatePromises);
            
            res.status(200).json({
                message: 'Remaining categories updated successfully',
                remainingCategories: results
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async updateRemainingCategory(req, res, next) {
        try {
            const id = req.params.id;
            
            // Check for duplicate Rem_Kat_1_Kod_1 (excluding current category)
            if (req.body.Rem_Kat_1_Kod_1) {
                const existingCategory = await RemainingCategory.findOne({ 
                    Rem_Kat_1_Kod_1: req.body.Rem_Kat_1_Kod_1,
                    _id: { $ne: id }
                });
                if (existingCategory) {
                    return res.status(400).json({
                        message: `Category with code ${req.body.Rem_Kat_1_Kod_1} already exists`
                    });
                }
            }

            const updatedCategory = await RemainingCategory.findByIdAndUpdate(
                id,
                { 
                    Rem_Kat_1_Kod_1: req.body.Rem_Kat_1_Kod_1,
                    Rem_Kat_1_Opis_1: req.body.Rem_Kat_1_Opis_1,
                    Plec: req.body.Plec,
                    number_id: req.body.number_id
                },
                { new: true }
            );

            if (!updatedCategory) {
                return res.status(404).json({ message: "Category not found" });
            }

            res.status(200).json({
                message: "Category updated successfully",
                remainingCategory: updatedCategory
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async deleteRemainingCategory(req, res, next) {
        try {
            const id = req.params.id;
            const deletedCategory = await RemainingCategory.findByIdAndDelete(id);

            if (!deletedCategory) {
                return res.status(404).json({ message: "Category not found" });
            }

            res.status(200).json({
                message: "Category deleted successfully",
                remainingCategory: deletedCategory
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async deleteAllRemainingCategories(req, res, next) {
        try {
            const result = await RemainingCategory.deleteMany({});
            res.status(200).json({
                message: "All remaining categories deleted successfully",
                deletedCount: result.deletedCount
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new RemainingCategoryController();