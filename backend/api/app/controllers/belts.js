const Belts = require('../models/belts');
const mongoose = require('mongoose');

class BeltsController {
    async getAllBelts(req, res, next) {
        try {
            const belts = await Belts.find().select('_id Belt_Kod Belt_Opis Rodzaj');
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.status(200).json({
                count: belts.length,
                belts: belts.map(belt => ({
                    _id: belt._id,
                    Belt_Kod: belt.Belt_Kod,
                    Belt_Opis: belt.Belt_Opis,
                    Rodzaj: belt.Rodzaj
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

    async createBelt(req, res, next) {
        try {
            const { Belt_Kod, Belt_Opis, Rodzaj } = req.body;

            // Sprawdź czy pasek już istnieje
            const existingBelt = await Belts.findOne({ Belt_Kod });
            if (existingBelt) {
                return res.status(400).json({ message: 'Pasek o tym kodzie już istnieje!' });
            }

            const belt = new Belts({
                _id: new mongoose.Types.ObjectId(),
                Belt_Kod,
                Belt_Opis,
                Rodzaj: Rodzaj || 'D'
            });

            const savedBelt = await belt.save();
            res.status(201).json({
                message: 'Pasek został dodany pomyślnie',
                createdBelt: {
                    _id: savedBelt._id,
                    Belt_Kod: savedBelt.Belt_Kod,
                    Belt_Opis: savedBelt.Belt_Opis,
                    Rodzaj: savedBelt.Rodzaj
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

    async updateBelt(req, res, next) {
        try {
            const id = req.params.beltId;
            const { Belt_Kod, Belt_Opis, Rodzaj } = req.body;

            // Sprawdź czy inny pasek już ma ten kod
            const existingBelt = await Belts.findOne({ Belt_Kod, _id: { $ne: id } });
            if (existingBelt) {
                return res.status(400).json({ message: 'Pasek o tym kodzie już istnieje!' });
            }

            const updateData = {
                Belt_Kod,
                Belt_Opis,
                Rodzaj
            };

            // Get old belt data for comparison
            const oldBelt = await Belts.findById(id);
            if (!oldBelt) {
                return res.status(404).json({ message: 'Pasek nie został znaleziony' });
            }

            const updatedBelt = await Belts.findByIdAndUpdate(id, updateData, { new: true });

            // Check if Belt_Opis changed and sync product names
            if (oldBelt.Belt_Opis !== updatedBelt.Belt_Opis) {
                try {
                    const axios = require('axios');
                    const config = require('../config');
                    
                    await axios.post(`${config.domain || 'http://localhost:3000'}/api/goods/sync-product-names`, {
                        type: 'belt',
                        oldValue: {
                            id: oldBelt._id.toString(),
                            name: oldBelt.Belt_Opis.trim()
                        },
                        newValue: {
                            id: updatedBelt._id.toString(), 
                            name: updatedBelt.Belt_Opis.trim()
                        },
                        fieldType: 'remainingsubsubcategory'
                    });
                    
                    console.log('Belt name change synchronized with products and price lists');
                } catch (syncError) {
                    console.error('Failed to sync belt name change:', syncError.message);
                }
            }

            res.status(200).json({
                message: 'Pasek został zaktualizowany pomyślnie',
                updatedBelt: {
                    _id: updatedBelt._id,
                    Belt_Kod: updatedBelt.Belt_Kod,
                    Belt_Opis: updatedBelt.Belt_Opis,
                    Rodzaj: updatedBelt.Rodzaj
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

    async deleteBelt(req, res, next) {
        try {
            const id = req.params.beltId;
            const deletedBelt = await Belts.findByIdAndDelete(id);
            
            if (!deletedBelt) {
                return res.status(404).json({ message: 'Pasek nie został znaleziony' });
            }

            res.status(200).json({
                message: 'Pasek został usunięty pomyślnie',
                deletedBelt: {
                    _id: deletedBelt._id,
                    Belt_Kod: deletedBelt.Belt_Kod,
                    Belt_Opis: deletedBelt.Belt_Opis
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

module.exports = new BeltsController();