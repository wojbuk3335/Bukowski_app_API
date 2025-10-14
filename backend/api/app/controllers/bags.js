const Bags = require('../db/models/bags');
const History = require('../db/models/history');
const Goods = require('../db/models/goods');
const mongoose = require('mongoose');
const axios = require('axios');
const config = require('../config');

// Get all bags
exports.getAllBags = async (req, res, next) => {
    try {
        const bags = await Bags.find();
        res.status(200).json({
            bags: bags
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Insert many Bags
exports.insertManyBags = async (req, res, next) => {
    try {
        // Check for duplicates
        for (const bagItem of req.body) {
            if (bagItem.Torebki_Nr) {
                const existingBag = await Bags.findOne({ Torebki_Nr: bagItem.Torebki_Nr });
                if (existingBag) {
                    return res.status(400).json({
                        message: `Bag with Torebki_Nr ${bagItem.Torebki_Nr} already exists`
                    });
                }
            }
        }

        // Add _id to each item if not present
        const itemsWithIds = req.body.map(bagItem => ({
            ...bagItem,
            _id: bagItem._id || new mongoose.Types.ObjectId()
        }));

        const result = await Bags.insertMany(itemsWithIds);
        
        // Log to history
        for (const bagItem of result) {
            const historyEntry = new History({
                collectionName: 'Torebki',
                operation: 'Utworzenie',
                product: '-',
                details: `Dodano nową torebkę: ${bagItem.Torebki_Kod || 'Nieznany kod'}`,
                userloggedinId: req.user ? req.user._id : null,
                timestamp: new Date()
            });
            await historyEntry.save();
        }
        
        res.status(201).json({
            message: "Bagss inserted successfully",
            Bagss: result
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update many Bags
exports.updateManyBags = async (req, res, next) => {
    try {
        const updatePromises = req.body.map(async (bagItem) => {
            // Get old bag data before update
            const oldBag = await Bags.findById(bagItem._id);
            
            const updatedBag = await Bags.findByIdAndUpdate(
                bagItem._id,
                { 
                    Torebki_Nr: bagItem.Torebki_Nr,
                    Torebki_Kod: bagItem.Torebki_Kod
                },
                { new: true }
            );

            // If Torebki_Kod changed, update corresponding goods
            if (oldBag && oldBag.Torebki_Kod !== bagItem.Torebki_Kod) {
                // Find all goods that have this bag by bagId and category 'Torebki'
                const goodsToUpdate = await Goods.find({
                    bagId: bagItem._id,
                    category: 'Torebki'
                }).populate('color');

                // Update each product
                for (const good of goodsToUpdate) {
                    const colorName = good.color ? good.color.Kol_Opis : '';
                    const newFullName = `${bagItem.Torebki_Kod} ${colorName}`.trim();
                    
                    await Goods.updateOne(
                        { _id: good._id },
                        { 
                            $set: { 
                                bagProduct: bagItem.Torebki_Kod,
                                fullName: newFullName
                            } 
                        }
                    );

                    // Log goods update to history
                    const goodsHistoryEntry = new History({
                        collectionName: 'Towary',
                        operation: 'Aktualizacja nazwy produktu',
                        product: newFullName,
                        details: `Nazwa produktu zmieniona z "${good.fullName}" na "${newFullName}" ze względu na zmianę kodu torebki`,
                        userloggedinId: req.user ? req.user._id : null,
                        timestamp: new Date()
                    });
                    await goodsHistoryEntry.save();
                }
            }

            return updatedBag;
        });

        const results = await Promise.all(updatePromises);
        
        // Check if any bags were actually updated and if any goods were affected
        const updatedCount = results.filter(bag => bag !== null).length;
        
        // Synchronize price lists after updating multiple bags
        if (updatedCount > 0) {
            try {
                await axios.post(`${config.domain || 'http://localhost:3000'}/api/pricelists/sync-all`, {
                    updateOutdated: true,
                    addNew: false,
                    removeDeleted: false,
                    updatePrices: false // TYLKO NAZWY, nie ceny
                });
                console.log('Price lists synchronized after multiple bags update');
            } catch (syncError) {
                console.error('Error synchronizing price lists after multiple bags update:', syncError.message);
            }
        }
        
        // Log to history
        for (const bagItem of results) {
            if (bagItem) {
                const historyEntry = new History({
                    collectionName: 'Torebki',
                    operation: 'Aktualizacja',
                    product: '-',
                    details: `Kod torebki został zmieniony na ${bagItem.Torebki_Kod || 'brak'}`,
                    userloggedinId: req.user ? req.user._id : null,
                    timestamp: new Date()
                });
                await historyEntry.save();
            }
        }
        
        res.status(200).json({
            message: "Bagss updated successfully",
            Bagss: results
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update single Bags
exports.updateBags = async (req, res, next) => {
    try {
        const id = req.params.id;
        
        // Get old bag data before update
        const oldBag = await Bags.findById(id);
        if (!oldBag) {
            return res.status(404).json({ message: "Bag not found" });
        }
        
        // Check for duplicate Torebki_Nr (excluding current Bags)
        if (req.body.Torebki_Nr) {
            const existingBags = await Bags.findOne({ 
                Torebki_Nr: req.body.Torebki_Nr,
                _id: { $ne: id }
            });
            if (existingBags) {
                return res.status(400).json({
                    message: `Bags with Torebki_Nr ${req.body.Torebki_Nr} already exists`
                });
            }
        }

        const updatedBag = await Bags.findByIdAndUpdate(
            id,
            { 
                Torebki_Nr: req.body.Torebki_Nr,
                Torebki_Kod: req.body.Torebki_Kod
            },
            { new: true }
        );

        if (!updatedBag) {
            return res.status(404).json({ message: "Bag not found" });
        }

        // Update corresponding goods if Torebki_Kod changed
        if (req.body.Torebki_Kod !== undefined && oldBag.Torebki_Kod !== req.body.Torebki_Kod) {
            // Find all goods that have this bag by bagId and category 'Torebki'
            const goodsToUpdate = await Goods.find({
                bagId: id,
                category: 'Torebki'
            }).populate('color');
            
            // Update each product
            for (const good of goodsToUpdate) {
                const colorName = good.color ? good.color.Kol_Opis : '';
                const newFullName = `${req.body.Torebki_Kod} ${colorName}`.trim();
                
                await Goods.updateOne(
                    { _id: good._id },
                    { 
                        $set: { 
                            bagProduct: req.body.Torebki_Kod,
                            fullName: newFullName
                        } 
                    }
                );

                // Log goods update to history
                const goodsHistoryEntry = new History({
                    collectionName: 'Towary',
                    operation: 'Aktualizacja nazwy produktu',
                    product: newFullName,
                    details: `Nazwa produktu zmieniona z "${good.fullName}" na "${newFullName}" ze względu na zmianę kodu torebki`,
                    userloggedinId: req.user ? req.user._id : null,
                    timestamp: new Date()
                });
                await goodsHistoryEntry.save();
            }

            // Synchronize price lists after updating goods
            if (goodsToUpdate.length > 0) {
                try {
                    await axios.post(`${config.domain || 'http://localhost:3000'}/api/pricelists/sync-all`, {
                        updateOutdated: true,
                        addNew: false,
                        removeDeleted: false,
                        updatePrices: false // TYLKO NAZWY, nie ceny
                    });
                    console.log('Price lists synchronized after bag name update');
                } catch (syncError) {
                    console.error('Error synchronizing price lists after bag update:', syncError.message);
                }
            }
        }

        // Log to history with changes comparison
        let changes = [];
        
        // Compare Torebki_Kod
        if (req.body.Torebki_Kod !== undefined && oldBag.Torebki_Kod !== req.body.Torebki_Kod) {
            changes.push(`Kod torebki został zmieniony z ${oldBag.Torebki_Kod || 'brak'} na ${req.body.Torebki_Kod || 'brak'}`);
        }
        
        // Compare Torebki_Nr
        if (req.body.Torebki_Nr !== undefined && oldBag.Torebki_Nr !== req.body.Torebki_Nr) {
            changes.push(`Numer torebki został zmieniony z ${oldBag.Torebki_Nr || 'brak'} na ${req.body.Torebki_Nr || 'brak'}`);
        }
        
        const details = changes.length > 0 ? changes.join(', ') : 'Brak zmian w torebce';
        
        const historyEntry = new History({
            collectionName: 'Torebki',
            operation: 'Aktualizacja',
            product: '-',
            details: details,
            userloggedinId: req.user ? req.user._id : null,
            timestamp: new Date()
        });
        await historyEntry.save();

        res.status(200).json({
            message: "Bag updated successfully",
            bag: updatedBag
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete single Bags
exports.deleteBags = async (req, res, next) => {
    try {
        const id = req.params.id;
        const deletedBag = await Bags.findByIdAndDelete(id);

        if (!deletedBag) {
            return res.status(404).json({ message: "Bag not found" });
        }

        res.status(200).json({
            message: "Bag deleted successfully",
            bag: deletedBag
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete all Bags
exports.deleteAllBags = async (req, res, next) => {
    try {
        const result = await Bags.deleteMany({});
        res.status(200).json({
            message: "All Bagss deleted successfully",
            deletedCount: result.deletedCount
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
