const BagsCategory = require('../db/models/bagsCategory');
const mongoose = require('mongoose');

class BagsCategoryController {
    async getAllBagsCategories(req, res, next) {
        BagsCategory.find()
            .select('_id Kat_1_Kod_1 Kat_1_Opis_1 Plec number_id')
            .then(bagCategories => {
                res.status(200).json({
                    count: bagCategories.length,
                    bagCategories: bagCategories.map(bagCategory => ({
                        _id: bagCategory._id,
                        Kat_1_Kod_1: bagCategory.Kat_1_Kod_1,
                        Kat_1_Opis_1: bagCategory.Kat_1_Opis_1,
                        Plec: bagCategory.Plec,
                        number_id: bagCategory.number_id
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

    async insertManyBagsCategories(req, res, next) {
        const bagCategoriesToInsert = req.body;

        if (!Array.isArray(bagCategoriesToInsert) || bagCategoriesToInsert.length === 0) {
            return res.status(400).json({ message: 'Invalid input: expected an array of bag categories' });
        }

        const formattedBagCategories = bagCategoriesToInsert.map(bagCategory => ({
            _id: new mongoose.Types.ObjectId(),
            Kat_1_Kod_1: bagCategory.Kat_1_Kod_1,
            Kat_1_Opis_1: bagCategory.Kat_1_Opis_1 || '',
            Plec: bagCategory.Plec || '',
            number_id: bagCategory.number_id
        }));

        BagsCategory.insertMany(formattedBagCategories)
            .then(result => {
                res.status(201).json({
                    message: 'Bag categories created successfully',
                    count: result.length,
                    createdBagCategories: result
                });
            })
            .catch(error => {
                res.status(500).json({
                    error: {
                        message: error.message
                    }
                });
            });
    }

    async updateManyBagsCategories(req, res, next) {
        const bagCategoriesToUpdate = req.body;

        if (!Array.isArray(bagCategoriesToUpdate) || bagCategoriesToUpdate.length === 0) {
            return res.status(400).json({ message: 'Invalid input: expected an array of bag categories to update' });
        }

        try {
            const updatePromises = bagCategoriesToUpdate.map(bagCategory => {
                return BagsCategory.updateOne(
                    { _id: bagCategory._id },
                    {
                        $set: {
                            Kat_1_Kod_1: bagCategory.Kat_1_Kod_1,
                            Kat_1_Opis_1: bagCategory.Kat_1_Opis_1,
                            Plec: bagCategory.Plec,
                            number_id: bagCategory.number_id
                        }
                    }
                );
            });

            const results = await Promise.all(updatePromises);
            const modifiedCount = results.reduce((sum, result) => sum + result.modifiedCount, 0);

            res.status(200).json({
                message: 'Bag categories updated successfully',
                modifiedCount: modifiedCount
            });
        } catch (error) {
            res.status(500).json({
                error: {
                    message: error.message
                }
            });
        }
    }

    async updateBagsCategory(req, res, next) {
        const id = req.params.bagsCategoryId;
        const updateData = {
            Kat_1_Opis_1: req.body.Kat_1_Opis_1
        };

        // Dodaj Plec do updateData jeśli zostało przesłane
        if (req.body.Plec !== undefined) {
            updateData.Plec = req.body.Plec;
        }

        BagsCategory.updateOne({ _id: id }, { $set: updateData })
            .then(result => {
                if (result.modifiedCount > 0) {
                    return res.status(200).json({
                        message: 'Bag category updated successfully'
                    });
                } else {
                    return res.status(404).json({
                        message: 'Bag category not found or no changes made'
                    });
                }
            })
            .catch(error => {
                res.status(500).json({
                    error: {
                        message: error.message
                    }
                });
            });
    }

    async deleteAllBagsCategories(req, res, next) {
        BagsCategory.deleteMany({})
            .then(result => {
                res.status(200).json({
                    message: 'All bag categories deleted successfully',
                    deletedCount: result.deletedCount
                });
            })
            .catch(error => {
                res.status(500).json({
                    error: {
                        message: error.message
                    }
                });
            });
    }
}

module.exports = BagsCategoryController;