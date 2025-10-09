const Manufacturer = require('../db/models/manufacturer');
const mongoose = require('mongoose');

class ManufacturerController {
    async getAllManufacturers(req, res, next) {
        try {
            const manufacturers = await Manufacturer.find().select('_id Prod_Kod Prod_Opis');
            res.status(200).json({
                count: manufacturers.length,
                manufacturers: manufacturers.map(manufacturer => ({
                    _id: manufacturer._id,
                    Prod_Kod: manufacturer.Prod_Kod,
                    Prod_Opis: manufacturer.Prod_Opis
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

    async createManufacturer(req, res, next) {
        try {
            const { Prod_Kod, Prod_Opis } = req.body;

            // Sprawdź czy producent już istnieje
            const existingManufacturer = await Manufacturer.findOne({ Prod_Kod });
            if (existingManufacturer) {
                return res.status(400).json({ message: 'Producent o tym kodzie już istnieje!' });
            }

            const manufacturer = new Manufacturer({
                _id: new mongoose.Types.ObjectId(),
                Prod_Kod,
                Prod_Opis
            });

            const savedManufacturer = await manufacturer.save();
            res.status(201).json({
                message: 'Producent został dodany pomyślnie',
                createdManufacturer: {
                    _id: savedManufacturer._id,
                    Prod_Kod: savedManufacturer.Prod_Kod,
                    Prod_Opis: savedManufacturer.Prod_Opis
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

    async updateManufacturer(req, res, next) {
        try {
            const id = req.params.manufacturerId;
            const { Prod_Kod, Prod_Opis } = req.body;

            // Sprawdź czy inny producent już ma ten kod
            const existingManufacturer = await Manufacturer.findOne({ Prod_Kod, _id: { $ne: id } });
            if (existingManufacturer) {
                return res.status(400).json({ message: 'Producent o tym kodzie już istnieje!' });
            }

            const updateData = {
                Prod_Kod,
                Prod_Opis
            };

            const updatedManufacturer = await Manufacturer.findByIdAndUpdate(id, updateData, { new: true });
            
            if (!updatedManufacturer) {
                return res.status(404).json({ message: 'Producent nie został znaleziony' });
            }

            res.status(200).json({
                message: 'Producent został zaktualizowany pomyślnie',
                updatedManufacturer: {
                    _id: updatedManufacturer._id,
                    Prod_Kod: updatedManufacturer.Prod_Kod,
                    Prod_Opis: updatedManufacturer.Prod_Opis
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

    async deleteManufacturer(req, res, next) {
        try {
            const id = req.params.manufacturerId;
            const deletedManufacturer = await Manufacturer.findByIdAndDelete(id);
            
            if (!deletedManufacturer) {
                return res.status(404).json({ message: 'Producent nie został znaleziony' });
            }

            res.status(200).json({
                message: 'Producent został usunięty pomyślnie',
                deletedManufacturer: {
                    _id: deletedManufacturer._id,
                    Prod_Kod: deletedManufacturer.Prod_Kod,
                    Prod_Opis: deletedManufacturer.Prod_Opis
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

module.exports = new ManufacturerController();