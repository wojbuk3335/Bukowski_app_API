const Goods = require('../db/models/goods');
const mongoose = require('mongoose');
const multer = require('multer');
const upload = multer();
const config = require('../config');

class GoodsController {
    async createGood(req, res, next) {
        console.log('Creating good with data:', req.body);
        console.log('Karpacz prices received:', { priceKarpacz: req.body.priceKarpacz, discount_priceKarpacz: req.body.discount_priceKarpacz });
        const { stock, color, fullName, code, category, subcategory, remainingsubsubcategory, manufacturer, price, discount_price, sellingPoint, barcode, Plec, bagProduct, bagId, bagsCategoryId, priceKarpacz, discount_priceKarpacz } = req.body; // Add manufacturer and Karpacz fields
        const picture = req.file ? `${config.domain}/images/${req.file.filename}` : '';
        const priceExceptions = JSON.parse(req.body.priceExceptions || '[]');
        const priceExceptionsKarpacz = JSON.parse(req.body.priceExceptionsKarpacz || '[]');
        
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
            console.log('Validating remaining assortment:', {
                bagProduct: bagProduct,
                subcategory: subcategory,
                remainingsubsubcategory: remainingsubsubcategory
            });
            
            if (!bagProduct) {
                return res.status(400).json({ message: 'Product code is required for remaining assortment category' });
            }
            if (!subcategory) {
                return res.status(400).json({ message: 'Subcategory is required for remaining assortment' });
            }
            if (!remainingsubsubcategory) {
                return res.status(400).json({ message: 'Remaining subcategory is required for remaining assortment' });
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
            price: parseFloat(price) || 0,
            discount_price: parseFloat(discount_price) || 0,
            picture,
            priceExceptions,
            sellingPoint,
            barcode,
            // Karpacz pricing fields
            priceKarpacz: parseFloat(priceKarpacz) || 0,
            discount_priceKarpacz: parseFloat(discount_priceKarpacz) || 0,
            priceExceptionsKarpacz
        };

        // Add manufacturer if provided
        if (manufacturer) {
            goodData.manufacturer = manufacturer;
        }

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
            
            // Convert remainingsubsubcategory ID to text description
            let remainingSubcategoryText = '';
            if (remainingsubsubcategory && subcategory) {
                if (subcategory === 'belts') {
                    const Belts = require('../models/belts');
                    const mongoose = require('mongoose');
                    let beltId = remainingsubsubcategory;
                    if (typeof beltId === 'string') {
                        beltId = new mongoose.Types.ObjectId(beltId);
                    }
                    const beltData = await Belts.findById(beltId).select('Belt_Opis');
                    remainingSubcategoryText = beltData ? beltData.Belt_Opis : '';
                } else if (subcategory === 'gloves') {
                    const Gloves = require('../models/gloves');
                    const mongoose = require('mongoose');
                    let gloveId = remainingsubsubcategory;
                    if (typeof gloveId === 'string') {
                        gloveId = new mongoose.Types.ObjectId(gloveId);
                    }
                    const gloveData = await Gloves.findById(gloveId).select('Glove_Opis');
                    remainingSubcategoryText = gloveData ? gloveData.Glove_Opis : '';
                } else {
                    remainingSubcategoryText = remainingsubsubcategory; // For regular subcategories
                }
            }
            
            goodData.remainingsubsubcategory = remainingSubcategoryText; // Save text description instead of ObjectId
            goodData.Plec = Plec; // Płeć z kategorii pozostałego asortymentu
            
            console.log('Saving remaining assortment data:', {
                subcategory: goodData.subcategory,
                remainingsubsubcategory: goodData.remainingsubsubcategory,
                bagsCategoryId: goodData.bagsCategoryId
            });
        } else {
            goodData.stock = stock;
            goodData.subcategory = subcategory;
            goodData.Plec = Plec;
        }

        const newGood = new Goods(goodData);

        newGood.save()
            .then(result => {
                console.log('Saved good to database:', {
                    _id: result._id,
                    category: result.category,
                    subcategory: result.subcategory,
                    remainingsubsubcategory: result.remainingsubsubcategory,
                    bagsCategoryId: result.bagsCategoryId
                });
                
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
                        barcode: result.barcode,
                        // Karpacz pricing fields
                        priceKarpacz: result.priceKarpacz,
                        discount_priceKarpacz: result.discount_priceKarpacz,
                        priceExceptionsKarpacz: result.priceExceptionsKarpacz
                    }
                });
            })
            .catch(error => {
                console.error('Error creating good:', error);
                console.error('Good data:', goodData);
                res.status(500).json({
                    error: error.message || error,
                    message: 'Failed to create good'
                });
            });
    }

    async getAllGoods(req, res, next) {
        try {
            const goods = await Goods.find()
                .select('_id stock color bagProduct bagId bagsCategoryId fullName code category subcategory remainingSubcategory remainingsubsubcategory manufacturer Plec price discount_price picture priceExceptions sellingPoint barcode priceKarpacz discount_priceKarpacz priceExceptionsKarpacz')
                .populate('stock', 'Tow_Opis Tow_Kod')
                .populate('color', 'Kol_Opis Kol_Kod')
                .populate('manufacturer', 'Prod_Opis Prod_Kod')
                .populate('priceExceptions.size', 'Roz_Opis')
                .populate('priceExceptionsKarpacz.size', 'Roz_Opis');

            // Manually populate subcategory based on category
            const populatedGoods = await Promise.all(goods.map(async (good) => {
                if (good.category === 'Kurtki kożuchy futra' && good.subcategory) {
                    // For coats, populate from SubcategoryCoats model
                    const SubcategoryCoats = require('../db/models/subcategoryCoats');
                    const subcategoryData = await SubcategoryCoats.findById(good.subcategory).select('Kat_1_Opis_1 Płeć');
                    return {
                        ...good.toObject(),
                        subcategory: subcategoryData
                    };
                } else if (good.category === 'Torebki' && good.bagsCategoryId) {
                    // For bags, populate from BagsCategory model using bagsCategoryId
                    const BagsCategory = require('../db/models/bagsCategory');
                    const bagsCategoryData = await BagsCategory.findById(good.bagsCategoryId).select('Kat_1_Opis_1 Plec');
                    return {
                        ...good.toObject(),
                        subcategory: bagsCategoryData // Map bagsCategory to subcategory for display
                    };
                } else if (good.category === 'Pozostały asortyment' && good.subcategory) {
                    // For remaining products, populate subcategory from RemainingCategory
                    console.log('Processing remaining product:', good._id, 'subcategory:', good.subcategory);
                    const RemainingCategory = require('../db/models/remainingCategory');
                    
                    // Check if subcategory is "belts" or "gloves" (static categories)
                    let subcategoryData = null;
                    if (good.subcategory === 'belts' || good.subcategory === 'gloves') {
                        // Handle static categories
                        if (good.subcategory === 'belts') {
                            subcategoryData = { _id: 'belts', Rem_Kat_1_Opis_1: 'Paski' };
                        } else if (good.subcategory === 'gloves') {
                            subcategoryData = { _id: 'gloves', Rem_Kat_1_Opis_1: 'Rękawiczki' };
                        }
                    } else {
                        // Handle regular remaining categories
                        subcategoryData = await RemainingCategory.findById(good.subcategory).select('Rem_Kat_1_Opis_1');
                    }
                    
                    // Check both old and new field names for remaining subcategory
                    let remainingSubcategoryData = null;
                    const remainingSubcategoryValue = good.remainingsubsubcategory || good.remainingSubcategory;
                    
                    if (remainingSubcategoryValue) {
                        // If it's already text, use it directly
                        if (typeof remainingSubcategoryValue === 'string' && !remainingSubcategoryValue.match(/^[0-9a-fA-F]{24}$/)) {
                            remainingSubcategoryData = {
                                Sub_Opis: remainingSubcategoryValue
                            };
                        } else {
                            // Legacy data - still ObjectId, need to populate
                            if (good.subcategory === 'belts') {
                                const Belts = require('../models/belts');
                                const mongoose = require('mongoose');
                                let beltId = remainingSubcategoryValue;
                                if (typeof beltId === 'string') {
                                    beltId = new mongoose.Types.ObjectId(beltId);
                                }
                                const beltData = await Belts.findById(beltId).select('Belt_Opis Belt_Kod');
                                if (beltData) {
                                    remainingSubcategoryData = {
                                        _id: beltData._id,
                                        Sub_Opis: beltData.Belt_Opis,
                                        Sub_Kod: beltData.Belt_Kod
                                    };
                                }
                            } else if (good.subcategory === 'gloves') {
                                const Gloves = require('../models/gloves');
                                const mongoose = require('mongoose');
                                let gloveId = remainingSubcategoryValue;
                                if (typeof gloveId === 'string') {
                                    gloveId = new mongoose.Types.ObjectId(gloveId);
                                }
                                const gloveData = await Gloves.findById(gloveId).select('Glove_Opis Glove_Kod');
                                if (gloveData) {
                                    remainingSubcategoryData = {
                                        _id: gloveData._id,
                                        Sub_Opis: gloveData.Glove_Opis,
                                        Sub_Kod: gloveData.Glove_Kod
                                    };
                                }
                            } else {
                                const RemainingSubcategory = require('../db/models/remainingSubcategory');
                                const mongoose = require('mongoose');
                                let subcategoryId = remainingSubcategoryValue;
                                if (typeof subcategoryId === 'string') {
                                    subcategoryId = new mongoose.Types.ObjectId(subcategoryId);
                                }
                                remainingSubcategoryData = await RemainingSubcategory.findById(subcategoryId).select('Sub_Opis Sub_Kod');
                            }
                        }
                    }
                    
                    return {
                        ...good.toObject(),
                        subcategory: subcategoryData,
                        remainingSubcategory: remainingSubcategoryData
                    };
                } else if (good.subcategory) {
                    // For other categories, populate from Category model
                    const Category = require('../db/models/category');
                    const subcategoryData = await Category.findById(good.subcategory).select('Kat_1_Opis_1');
                    return {
                        ...good.toObject(),
                        subcategory: subcategoryData
                    };
                }
                return good.toObject();
            }));

            res.status(200).json({
                count: populatedGoods.length,
                goods: populatedGoods.map(good => ({
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
                    remainingSubcategory: good.remainingSubcategory,
                    manufacturer: good.manufacturer,
                    Plec: good.Plec, // Include Plec in the response
                    price: good.price,
                    discount_price: good.discount_price,
                    priceKarpacz: good.priceKarpacz,
                    discount_priceKarpacz: good.discount_priceKarpacz,
                    priceExceptionsKarpacz: good.priceExceptionsKarpacz,
                    picture: good.picture,
                    priceExceptions: good.priceExceptions,
                    sellingPoint: good.sellingPoint,
                    barcode: good.barcode
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
            barcode: req.body.barcode,
            // Karpacz pricing fields
            priceKarpacz: parseFloat(req.body.priceKarpacz) || 0,
            discount_priceKarpacz: parseFloat(req.body.discount_priceKarpacz) || 0,
            priceExceptionsKarpacz: JSON.parse(req.body.priceExceptionsKarpacz || '[]')
        };

        // Add manufacturer if provided
        if (req.body.manufacturer) {
            updateData.manufacturer = req.body.manufacturer;
        }

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
            updateData.remainingSubcategory = req.body.remainingSubcategory; // Dodaj podpodkategorię
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