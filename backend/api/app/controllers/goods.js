const Goods = require('../db/models/goods');
const mongoose = require('mongoose');
const multer = require('multer');
const upload = multer();
const config = require('../config');

class GoodsController {
    async createGood(req, res, next) {
        const { stock, color, fullName, code, category, price, discount_price, sellingPoint, barcode } = req.body;
        const picture = req.file ? `${config.domain}/images/${req.file.filename}` : '';
        const priceExceptions = JSON.parse(req.body.priceExceptions || '[]');


        //console.log

        console.log('Received data:', {
            stock,
            color,
            fullName,
            code,
            category,
            price,
            discount_price,
            picture,
            priceExceptions,
            sellingPoint,
            barcode
        });
        
        
        // Validate stock value
        if (stock === 'NIEOKREŚLONY') {
            return res.status(400).json({ message: 'Produkt value cannot be NIEOKREŚLONY' });
        }

        // Validate price
        if (price <= 0) {
            return res.status(400).json({ message: 'Cena musi być większa od zera' });
        }

        // // Validate required fields
        // if (!sellingPoint || !barcode) {
        //     return res.status(400).json({ message: 'Selling point and barcode are required' });
        // }

        // Check for duplicate sizes in price exceptions
        const sizeCounts = priceExceptions.reduce((acc, exception) => {
            acc[exception.size] = (acc[exception.size] || 0) + 1;
            return acc;
        }, {});
        const duplicateSize = Object.values(sizeCounts).some(count => count > 1);
        if (duplicateSize) {
            return res.status(400).json({ message: 'Nie może być dwóch wyjątków z tym samym rozmiarem' });
        }

        const newGood = new Goods({
            _id: new mongoose.Types.ObjectId(),
            stock,
            color,
            fullName,
            code,
            category,
            price,
            discount_price,
            picture,
            priceExceptions,
            sellingPoint,
            barcode
        });

        newGood.save()
            .then(result => {
                res.status(201).json({
                    message: 'Good created successfully',
                    createdGood: {
                        _id: result._id,
                        stock: result.stock,
                        color: result.color,
                        fullName: result.fullName,
                        code: result.code,
                        category: result.category,
                        price: result.price,
                        discount_price: result.discount_price,
                        picture: result.picture,
                        priceExceptions: result.priceExceptions,
                        sellingPoint: result.sellingPoint,
                        barcode: result.barcode
                    }
                });
            })
            .catch(error => {
                res.status(500).json({
                    error
                });
            });
    }

    async getAllGoods(req, res, next) {
        Goods.find()
            .select('_id stock color fullName code category price discount_price picture priceExceptions sellingPoint barcode')
            .populate('stock', 'Tow_Opis Tow_Kod')
            .populate('color', 'Kol_Opis Kol_Kod')
            .populate('category', 'Kat_Opis')
            .populate('priceExceptions.size', 'Roz_Opis')
            .then(goods => {
                res.status(200).json({
                    count: goods.length,
                    goods: goods.map(good => ({
                        _id: good._id,
                        stock: good.stock,
                        color: good.color,
                        fullName: good.fullName,
                        code: good.code,
                        category: good.category,
                        price: good.price,
                        discount_price: good.discount_price,
                        picture: good.picture,
                        priceExceptions: good.priceExceptions,
                        sellingPoint: good.sellingPoint,
                        barcode: good.barcode
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

    async updateGood(req, res, next) {
        const id = req.params.goodId;
        const updateData = {
            stock: req.body.stock,
            color: req.body.color,
            fullName: req.body.fullName,
            code: req.body.code,
            category: req.body.category,
            price: req.body.price,
            discount_price: req.body.discount_price || 0,
            priceExceptions: JSON.parse(req.body.priceExceptions || '[]'),
            sellingPoint: req.body.sellingPoint,
            barcode: req.body.barcode
        };

        if (req.file) {
            updateData.picture = `${config.domain}/images/${req.file.filename}`;
        }

        // Validate stock value
        if (updateData.stock === 'NIEOKREŚLONY') {
            return res.status(400).json({ message: 'Produkt value cannot be NIEOKREŚLONY' });
        }

        // Validate price
        if (updateData.price <= 0) {
            return res.status(400).json({ message: 'Cena musi być większa od zera' });
        }

        // Check for duplicate sizes in price exceptions
        const sizeCounts = updateData.priceExceptions.reduce((acc, exception) => {
            acc[exception.size] = (acc[exception.size] || 0) + 1;
            return acc;
        }, {});
        const duplicateSize = Object.values(sizeCounts).some(count => count > 1);
        if (duplicateSize) {
            return res.status(400).json({ message: 'Nie może być dwóch wyjątków z tym samym rozmiarem' });
        }

        Goods.updateOne({ _id: id }, { $set: updateData })
            .then(result => {
                if (result.nModified > 0) {
                    res.status(200).json({
                        message: 'Good updated successfully'
                    });
                } else {
                    res.status(404).json({
                        message: 'Good not found or no changes made'
                    });
                }
            })
            .catch(error => {
                res.status(500).json({
                    error
                });
            });
    }

    async deleteGood(req, res, next) {
        const id = req.params.goodId;
        Goods.deleteOne({ _id: id })
            .then(result => {
                if (result.deletedCount > 0) {
                    res.status(200).json({
                        message: 'Good deleted successfully'
                    });
                } else {
                    res.status(404).json({
                        message: 'Good not found'
                    });
                }
            })
            .catch(error => {
                res.status(500).json({
                    error
                });
            });
    }
}

module.exports = new GoodsController();