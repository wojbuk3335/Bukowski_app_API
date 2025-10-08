const Goods = require('../db/models/goods');
const mongoose = require('mongoose');
const multer = require('multer');
const upload = multer();
const config = require('../config');

class GoodsController {
    async createGood(req, res, next) {
        const { stock, color, fullName, code, category, subcategory, price, discount_price, sellingPoint, barcode, Plec, bagProduct, bagId, bagsCategoryId } = req.body; // Add bagsCategoryId
        const picture = req.file ? `${config.domain}/images/${req.file.filename}` : '';
        const priceExceptions = JSON.parse(req.body.priceExceptions || '[]');
        
        // Different validation for bags/wallets vs other products
        if (category === 'Torebki') {
            // Validation for bags
            if (!bagProduct) {
                return res.status(400).json({ message: 'Bag product code is required for bags category' });
            }
        } else if (category === 'Portfele') {
            // Validation for wallets
            if (!bagProduct) {
                return res.status(400).json({ message: 'Wallet product code is required for wallets category' });
            }
        } else if (category === 'Pozostały asortyment') {
            // Validation for remaining assortment
            if (!bagProduct) {
                return res.status(400).json({ message: 'Product code is required for remaining assortment category' });
            }
        } else {
            // Validation for other products
            if (stock === 'NIEOKREŚLONY') {
                return res.status(400).json({ message: 'Produkt value cannot be NIEOKREŚLONY' });
            }
        }

        // Validate price
        if (price <= 0) {
            return res.status(400).json({ message: 'Cena musi być większa od zera' });
        }

        // Check for duplicate sizes in price exceptions
        const sizeCounts = priceExceptions.reduce((acc, exception) => {
            acc[exception.size] = (acc[exception.size] || 0) + 1;
            return acc;
        }, {});
        const duplicateSize = Object.values(sizeCounts).some(count => count > 1);
        if (duplicateSize) {
            return res.status(400).json({ message: 'Nie może być dwóch wyjątków z tym samym rozmiarem' });
        }

        // Check for duplicate fullName and code
        const existingGood = await Goods.findOne({ $or: [{ fullName }, { code }] });
        if (existingGood) {
            if (existingGood.fullName === fullName) {
                return res.status(400).json({ message: 'Podana nazwa produktu już znajduje się w bazie danych!' });
            }
            if (existingGood.code === code) {
                return res.status(400).json({ message: 'Produkt o tym kodzie już znajduje się w bazie danych!' });
            }
        }

        const goodData = {
            _id: new mongoose.Types.ObjectId(),
            color,
            fullName,
            code,
            category: category.replace(/_/g, ' '), // Replace underscores with spaces
            price,
            discount_price,
            picture,
            priceExceptions,
            sellingPoint,
            barcode
        };

        // Add fields based on category
        if (category === 'Torebki') {
            goodData.bagProduct = bagProduct;
            goodData.bagId = bagId;
            goodData.bagsCategoryId = bagsCategoryId;
            goodData.Plec = Plec; // Płeć z kategorii torebek
        } else if (category === 'Portfele') {
            goodData.bagProduct = bagProduct; // Kod portfela
            goodData.bagId = bagId; // ID portfela (może być puste)
            goodData.bagsCategoryId = bagsCategoryId; // ID kategorii portfela
            goodData.Plec = Plec; // Płeć z kategorii portfeli
        } else if (category === 'Pozostały asortyment') {
            goodData.bagProduct = bagProduct; // Kod produktu pozostałego asortymentu
            goodData.bagId = bagId; // ID produktu (może być puste)
            goodData.bagsCategoryId = bagsCategoryId; // ID kategorii pozostałego asortymentu
            goodData.subcategory = subcategory; // Podkategoria dla pozostałego asortymentu
            goodData.Plec = Plec; // Płeć z kategorii pozostałego asortymentu
        } else {
            goodData.stock = stock;
            goodData.subcategory = subcategory;
            goodData.Plec = Plec;
        }

        const newGood = new Goods(goodData);

        newGood.save()
            .then(result => {
                res.status(201).json({
                    message: 'Good created successfully',
                    createdGood: {
                        _id: result._id,
                        stock: result.stock,
                        color: result.color,
                        bagProduct: result.bagProduct,
                        bagId: result.bagId,
                        fullName: result.fullName,
                        code: result.code,
                        category: result.category,
                        subcategory: result.subcategory,
                        Plec: result.Plec,
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
            .select('_id stock color bagProduct bagId bagsCategoryId fullName code category subcategory Plec price discount_price picture priceExceptions sellingPoint barcode')
            .populate('stock', 'Tow_Opis Tow_Kod')
            .populate('color', 'Kol_Opis Kol_Kod')
            .populate('subcategory', 'Kat_1_Opis_1') // Populate subcategory with its description
            .populate('priceExceptions.size', 'Roz_Opis') // Removed category population
            .then(goods => {
                res.status(200).json({
                    count: goods.length,
                    goods: goods.map(good => ({
                        _id: good._id,
                        stock: good.stock,
                        color: good.color,
                        bagProduct: good.bagProduct,
                        bagId: good.bagId,
                        bagsCategoryId: good.bagsCategoryId,
                        fullName: good.fullName,
                        code: good.code,
                        category: good.category ? good.category.replace(/_/g, ' ') : 'Nieokreślona', // Replace underscores with spaces, handle null
                        subcategory: good.subcategory,
                        Plec: good.Plec, // Include Plec in the response
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
            color: req.body.color,
            fullName: req.body.fullName,
            code: req.body.code,
            category: req.body.category ? req.body.category.replace(/_/g, ' ') : null, // Replace underscores with spaces
            price: parseFloat(req.body.price),
            discount_price: parseFloat(req.body.discount_price) || 0,
            priceExceptions: JSON.parse(req.body.priceExceptions || '[]'),
            sellingPoint: req.body.sellingPoint,
            barcode: req.body.barcode
        };

        // Add fields based on category
        if (req.body.category === 'Torebki') {
            updateData.bagProduct = req.body.bagProduct;
            updateData.bagId = req.body.bagId;
            updateData.bagsCategoryId = req.body.bagsCategoryId;
            updateData.Plec = req.body.Plec; // Płeć z kategorii torebek
        } else if (req.body.category === 'Portfele') {
            updateData.bagProduct = req.body.bagProduct;
            updateData.bagId = req.body.bagId;
            updateData.bagsCategoryId = req.body.bagsCategoryId;
            updateData.Plec = req.body.Plec; // Płeć z kategorii portfeli
        } else if (req.body.category === 'Pozostały asortyment') {
            updateData.bagProduct = req.body.bagProduct;
            updateData.bagId = req.body.bagId;
            updateData.bagsCategoryId = req.body.bagsCategoryId;
            updateData.subcategory = req.body.subcategory;
            updateData.Plec = req.body.Plec; // Płeć z kategorii pozostałego asortymentu
        } else {
            updateData.stock = req.body.stock;
            updateData.subcategory = req.body.subcategory;
            updateData.Plec = req.body.Plec;
        }

        if (req.file) {
            updateData.picture = `${config.domain}/images/${req.file.filename}`;
        }

        // Different validation for bags vs other products
        if (req.body.category === 'Torebki') {
            // Validation for bags
            if (!req.body.bagProduct) {
                return res.status(400).json({ message: 'Bag product code is required for bags category' });
            }
        } else if (req.body.category === 'Portfele') {
            // Validation for wallets
            if (!req.body.bagProduct) {
                return res.status(400).json({ message: 'Wallet product code is required for wallets category' });
            }
        } else if (req.body.category === 'Pozostały asortyment') {
            // Validation for remaining assortment
            if (!req.body.bagProduct) {
                return res.status(400).json({ message: 'Product code is required for remaining assortment category' });
            }
        } else {
            // Validation for other products
            if (updateData.stock === 'NIEOKREŚLONY') {
                return res.status(400).json({ message: 'Produkt value cannot be NIEOKREŚLONY' });
            }
        }

        // Validate price
        if (isNaN(updateData.price) || updateData.price <= 0) {
            return res.status(400).json({ message: 'Cena musi być liczbą większą od zera' });
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
                if (result.matchedCount > 0) {
                    if (result.modifiedCount > 0 || result.nModified > 0) {
                        return res.status(200).json({
                            message: 'Good updated successfully'
                        });
                    } else {
                        return res.status(200).json({
                            message: 'Good found but no changes were needed'
                        });
                    }
                } else {
                    return res.status(404).json({
                        message: 'Good not found'
                    });
                }
            })
            .catch(error => {
                return res.status(500).json({
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