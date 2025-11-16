const Gloves = require('../models/gloves');
const mongoose = require('mongoose');

class GlovesController {
    async getAllGloves(req, res, next) {
        try {
            const gloves = await Gloves.find().select('_id Glove_Kod Glove_Opis Rodzaj');
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.status(200).json({
                count: gloves.length,
                gloves: gloves.map(glove => ({
                    _id: glove._id,
                    Glove_Kod: glove.Glove_Kod,
                    Glove_Opis: glove.Glove_Opis,
                    Rodzaj: glove.Rodzaj
                }))
            });
        } catch (err) {
            res.status(500).json({
                error: {
                    message: err.message
                }
            });
        }
    }

    async createGlove(req, res, next) {
        try {
            const { Glove_Kod, Glove_Opis, Rodzaj } = req.body;

            // Sprawdź czy rękawiczka już istnieje
            const existingGlove = await Gloves.findOne({ Glove_Kod });
            if (existingGlove) {
                return res.status(400).json({ message: 'Rękawiczka o tym kodzie już istnieje!' });
            }

            const glove = new Gloves({
                _id: new mongoose.Types.ObjectId(),
                Glove_Kod,
                Glove_Opis,
                Rodzaj: Rodzaj || 'D'
            });

            const savedGlove = await glove.save();
            res.status(201).json({
                message: 'Rękawiczka została dodana pomyślnie',
                createdGlove: {
                    _id: savedGlove._id,
                    Glove_Kod: savedGlove.Glove_Kod,
                    Glove_Opis: savedGlove.Glove_Opis,
                    Rodzaj: savedGlove.Rodzaj
                }
            });
        } catch (err) {
            res.status(500).json({
                error: {
                    message: err.message
                }
            });
        }
    }

    async updateGlove(req, res, next) {
        try {
            const id = req.params.gloveId;
            const { Glove_Kod, Glove_Opis, Rodzaj } = req.body;

            // Sprawdź czy inna rękawiczka już ma ten kod
            const existingGlove = await Gloves.findOne({ Glove_Kod, _id: { $ne: id } });
            if (existingGlove) {
                return res.status(400).json({ message: 'Rękawiczka o tym kodzie już istnieje!' });
            }

            const updateData = {
                Glove_Kod,
                Glove_Opis,
                Rodzaj
            };

            // Get old glove data for comparison
            const oldGlove = await Gloves.findById(id);
            if (!oldGlove) {
                return res.status(404).json({ message: 'Rękawiczka nie została znaleziona' });
            }

            const updatedGlove = await Gloves.findByIdAndUpdate(id, updateData, { new: true });

            // Check if Glove_Opis changed and sync product names
            if (oldGlove.Glove_Opis !== updatedGlove.Glove_Opis) {
                try {
                    const axios = require('axios');
                    const config = require('../config');
                    
                    await axios.post(`${config.domain || 'http://localhost:3000'}/api/goods/sync-product-names`, {
                        type: 'glove',
                        oldValue: {
                            id: oldGlove._id.toString(),
                            name: oldGlove.Glove_Opis.trim()
                        },
                        newValue: {
                            id: updatedGlove._id.toString(), 
                            name: updatedGlove.Glove_Opis.trim()
                        },
                        fieldType: 'remainingsubsubcategory'
                    });
                    
                    console.log('Glove name change synchronized with products and price lists');
                } catch (syncError) {
                    console.error('Failed to sync glove name change:', syncError.message);
                }
            }

            res.status(200).json({
                message: 'Rękawiczka została zaktualizowana pomyślnie',
                updatedGlove: {
                    _id: updatedGlove._id,
                    Glove_Kod: updatedGlove.Glove_Kod,
                    Glove_Opis: updatedGlove.Glove_Opis,
                    Rodzaj: updatedGlove.Rodzaj
                }
            });
        } catch (err) {
            res.status(500).json({
                error: {
                    message: err.message
                }
            });
        }
    }

    async deleteGlove(req, res, next) {
        try {
            const id = req.params.gloveId;
            const deletedGlove = await Gloves.findByIdAndDelete(id);
            
            if (!deletedGlove) {
                return res.status(404).json({ message: 'Rękawiczka nie została znaleziona' });
            }

            res.status(200).json({
                message: 'Rękawiczka została usunięta pomyślnie',
                deletedGlove: {
                    _id: deletedGlove._id,
                    Glove_Kod: deletedGlove.Glove_Kod,
                    Glove_Opis: deletedGlove.Glove_Opis
                }
            });
        } catch (err) {
            res.status(500).json({
                error: {
                    message: err.message
                }
            });
        }
    }
}

module.exports = new GlovesController();