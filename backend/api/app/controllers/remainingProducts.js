const RemainingProducts = require('../db/models/remainingProducts');
const History = require('../db/models/history');
const mongoose = require('mongoose');

// Get all remaining products
exports.getAllRemainingProducts = async (req, res, next) => {
    try {
        const remainingProducts = await RemainingProducts.find();
        res.status(200).json({
            remainingProducts: remainingProducts
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Insert many Remaining Products
exports.insertManyRemainingProducts = async (req, res, next) => {
    try {
        // Validate Poz_Kod format for all items
        for (const productItem of req.body) {
            if (productItem.Poz_Kod) {
                const decimalMatches = productItem.Poz_Kod.match(/\d+\.\d+/g);
                if (decimalMatches) {
                    for (let match of decimalMatches) {
                        const decimalPart = match.split('.')[1];
                        if (decimalPart && decimalPart.length > 3) {
                            return res.status(400).json({ message: `Poz_Kod "${productItem.Poz_Kod}" nie może zawierać liczb z więcej niż 3 cyframi po kropce!` });
                        }
                    }
                }
            }
        }

        // Check for duplicates
        for (const productItem of req.body) {
            if (productItem.Poz_Nr) {
                const existingProduct = await RemainingProducts.findOne({ Poz_Nr: productItem.Poz_Nr });
                if (existingProduct) {
                    return res.status(400).json({
                        message: `Product with Poz_Nr ${productItem.Poz_Nr} already exists`
                    });
                }
            }
        }

        // Add _id to each item if not present
        const itemsWithIds = req.body.map(productItem => ({
            ...productItem,
            _id: productItem._id || new mongoose.Types.ObjectId()
        }));

        const result = await RemainingProducts.insertMany(itemsWithIds);
        
        // Log to history
        for (const productItem of result) {
            const historyEntry = new History({
                collectionName: 'Pozostały asortyment',
                operation: 'Utworzenie',
                product: '-',
                details: `Dodano nowy produkt: ${productItem.Poz_Kod || 'Nieznany kod'}`,
                userloggedinId: req.user ? req.user._id : null,
                timestamp: new Date()
            });
            await historyEntry.save();
        }
        
        res.status(201).json({
            message: "Remaining products inserted successfully",
            RemainingProducts: result
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update many Remaining Products
exports.updateManyRemainingProducts = async (req, res, next) => {
    try {
        const updatePromises = req.body.map(productItem => {
            return RemainingProducts.findByIdAndUpdate(
                productItem._id,
                { 
                    Poz_Nr: productItem.Poz_Nr,
                    Poz_Kod: productItem.Poz_Kod
                },
                { new: true }
            );
        });

        const results = await Promise.all(updatePromises);
        
        // Log to history
        for (const productItem of results) {
            if (productItem) {
                const historyEntry = new History({
                    collectionName: 'Pozostały asortyment',
                    operation: 'Aktualizacja',
                    product: '-',
                    details: `Kod produktu został zmieniony na ${productItem.Poz_Kod || 'brak'}`,
                    userloggedinId: req.user ? req.user._id : null,
                    timestamp: new Date()
                });
                await historyEntry.save();
            }
        }
        
        res.status(200).json({
            message: "Remaining products updated successfully",
            RemainingProducts: results
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update single Remaining Product
exports.updateRemainingProducts = async (req, res, next) => {
    try {
        const id = req.params.id;
        
        // Validate Poz_Kod format - max 3 decimal places for any numbers
        if (req.body.Poz_Kod) {
            const decimalMatches = req.body.Poz_Kod.match(/\d+\.\d+/g);
            if (decimalMatches) {
                for (let match of decimalMatches) {
                    const decimalPart = match.split('.')[1];
                    if (decimalPart && decimalPart.length > 3) {
                        return res.status(400).json({ message: 'Poz_Kod nie może zawierać liczb z więcej niż 3 cyframi po kropce!' });
                    }
                }
            }
        }
        
        // Get old product data before update
        const oldProduct = await RemainingProducts.findById(id);
        if (!oldProduct) {
            return res.status(404).json({ message: "Product not found" });
        }
        
        // Check for duplicate Poz_Nr (excluding current Product)
        if (req.body.Poz_Nr) {
            const existingProduct = await RemainingProducts.findOne({ 
                Poz_Nr: req.body.Poz_Nr,
                _id: { $ne: id }
            });
            if (existingProduct) {
                return res.status(400).json({
                    message: `Product with Poz_Nr ${req.body.Poz_Nr} already exists`
                });
            }
        }

        const updatedProduct = await RemainingProducts.findByIdAndUpdate(
            id,
            { 
                Poz_Nr: req.body.Poz_Nr,
                Poz_Kod: req.body.Poz_Kod
            },
            { new: true }
        );

        if (!updatedProduct) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Check if Poz_Kod changed and sync with goods
        if (oldProduct.Poz_Kod !== req.body.Poz_Kod) {
            try {
                const axios = require('axios');
                const config = require('../config');
                
                await axios.post(`${config.domain || 'http://localhost:3000'}/api/excel/goods/sync-product-names`, {
                    type: 'remainingProduct',
                    oldValue: {
                        id: id,
                        name: oldProduct.Poz_Kod
                    },
                    newValue: {
                        id: id,
                        name: req.body.Poz_Kod
                    },
                    fieldType: 'bagProduct'
                });
                
                console.log('Remaining product code change synchronized with goods and price lists');
            } catch (syncError) {
                console.error('Failed to sync remaining product code change:', syncError.message);
            }
        }

        // Log to history with changes comparison
        let changes = [];
        
        // Compare Poz_Kod
        if (req.body.Poz_Kod !== undefined && oldProduct.Poz_Kod !== req.body.Poz_Kod) {
            changes.push(`Kod produktu został zmieniony z ${oldProduct.Poz_Kod || 'brak'} na ${req.body.Poz_Kod || 'brak'}`);
        }
        
        // Compare Poz_Nr
        if (req.body.Poz_Nr !== undefined && oldProduct.Poz_Nr !== req.body.Poz_Nr) {
            changes.push(`Numer pozycji został zmieniony z ${oldProduct.Poz_Nr || 'brak'} na ${req.body.Poz_Nr || 'brak'}`);
        }
        
        const details = changes.length > 0 ? changes.join(', ') : 'Brak zmian w produkcie';
        
        const historyEntry = new History({
            collectionName: 'Pozostały asortyment',
            operation: 'Aktualizacja',
            product: '-',
            details: details,
            userloggedinId: req.user ? req.user._id : null,
            timestamp: new Date()
        });
        await historyEntry.save();

        res.status(200).json({
            message: "Product updated successfully",
            remainingProduct: updatedProduct
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete single Remaining Product
exports.deleteRemainingProducts = async (req, res, next) => {
    try {
        const id = req.params.id;
        const deletedProduct = await RemainingProducts.findByIdAndDelete(id);

        if (!deletedProduct) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.status(200).json({
            message: "Product deleted successfully",
            remainingProduct: deletedProduct
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete all Remaining Products
exports.deleteAllRemainingProducts = async (req, res, next) => {
    try {
        const result = await RemainingProducts.deleteMany({});
        res.status(200).json({
            message: "All Remaining Products deleted successfully",
            deletedCount: result.deletedCount
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};