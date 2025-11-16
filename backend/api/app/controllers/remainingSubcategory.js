const RemainingSubcategory = require('../db/models/remainingSubcategory');
const mongoose = require('mongoose');

class RemainingSubcategoryController {
    
    async getAllRemainingSubcategories(req, res, next) {
        try {
            const result = await RemainingSubcategory.find()
                .populate('categoryId', 'Rem_Kat_1_Opis_1')
                .select('_id categoryId Sub_Kod Sub_Opis Plec');
            
            res.status(200).json({
                count: result.length,
                remainingSubcategories: result
            });
        } catch (error) {
            res.status(500).json({
                error: {
                    message: error.message
                }
            });
        }
    }

    async getRemainingSubcategoriesByCategory(req, res, next) {
        try {
            const categoryId = req.params.categoryId;
            
            const result = await RemainingSubcategory.find({ categoryId: categoryId })
                .select('_id categoryId Sub_Kod Sub_Opis Plec');
            
            res.status(200).json({
                count: result.length,
                remainingSubcategories: result
            });
        } catch (error) {
            res.status(500).json({
                error: {
                    message: error.message
                }
            });
        }
    }

    async insertManyRemainingSubcategories(req, res, next) {
        try {
            const subcategoriesToInsert = req.body.map(subcategory => ({
                _id: new mongoose.Types.ObjectId(),
                ...subcategory
            }));

            const result = await RemainingSubcategory.insertMany(subcategoriesToInsert);
            
            res.status(201).json({
                message: 'Remaining subcategories inserted successfully',
                count: result.length,
                remainingSubcategories: result
            });
        } catch (error) {
            res.status(500).json({
                error: {
                    message: error.message
                }
            });
        }
    }

    async updateRemainingSubcategoryById(req, res, next) {
        try {
            const id = req.params.id;
            const updates = req.body;
            
            const result = await RemainingSubcategory.findByIdAndUpdate(
                id, 
                { $set: updates }, 
                { new: true }
            );
            
            if (!result) {
                return res.status(404).json({
                    message: 'Remaining subcategory not found'
                });
            }
            
            res.status(200).json({
                message: 'Remaining subcategory updated successfully',
                remainingSubcategory: result
            });
        } catch (error) {
            res.status(500).json({
                error: {
                    message: error.message
                }
            });
        }
    }
}

module.exports = new RemainingSubcategoryController();