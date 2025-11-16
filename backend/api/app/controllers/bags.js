const Bags = require('../db/models/bags');
const History = require('../db/models/history');
const Goods = require('../db/models/goods');
const mongoose = require('mongoose');
const axios = require('axios');
const config = require('../config');

// Helper function to calculate control sum for barcode
const calculateControlSum = (code) => {
    let sum = 0;
    for (let i = 0; i < code.length; i++) {
        sum += parseInt(code[i]) * (i % 2 === 0 ? 1 : 3);
    }
    return (10 - (sum % 10)) % 10;
};

// Helper function to generate bag product code
const generateBagProductCode = (bagData, colorData) => {
    if (!bagData || !colorData) {
        return '';
    }

    // Format: 000 + kolor(2) + wiersz(4) + po_kropce(3) + suma_kontrolna(1)
    let code = '000';
    
    // Pozycje 4-5: Kod koloru (Kol_Kod)
    const colorCode = colorData.Kol_Kod || '00';
    code += colorCode.padStart(2, '0').substring(0, 2);
    
    // Pozycje 6-9: Numer wiersza (Torebki_Nr) - 4 cyfry
    const rowNumber = bagData.Torebki_Nr || 0;
    code += rowNumber.toString().padStart(4, '0').substring(0, 4);
    
    // Pozycje 10-12: Wartość po kropce z Torebki_Kod
    const bagCode = bagData.Torebki_Kod || '';
    const afterDotMatch = bagCode.match(/\.(\d{3})/); // Znajdź 3 cyfry po kropce
    const afterDotValue = afterDotMatch ? afterDotMatch[1] : '000';
    code += afterDotValue.padStart(3, '0').substring(0, 3);
    
    // Pozycja 13: Suma kontrolna
    const controlSum = calculateControlSum(code);
    code += controlSum;
    
    return code;
};

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
                    
                    // Generate new barcode based on updated bag data
                    const newCode = generateBagProductCode(updatedBag, good.color);
                    
                    await Goods.updateOne(
                        { _id: good._id },
                        { 
                            $set: { 
                                bagProduct: bagItem.Torebki_Kod,
                                fullName: newFullName,
                                code: newCode // Update barcode
                            } 
                        }
                    );

                    // Log goods update to history
                    const goodsHistoryEntry = new History({
                        collectionName: 'Towary',
                        operation: 'Aktualizacja kodu kreskowego i nazwy produktu',
                        product: newFullName,
                        details: `Produkt zaktualizowany ze względu na zmianę kodu torebki. Nowa nazwa: "${newFullName}", nowy kod kreskowy: "${newCode}"`,
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
                const token = req.headers.authorization;
                await axios.post(`${config.domain || 'http://localhost:3000'}/api/pricelists/sync-all`, {
                    updateOutdated: true,
                    addNew: false,
                    removeDeleted: false,
                    updatePrices: false // TYLKO NAZWY, nie ceny
                }, {
                    headers: {
                        Authorization: token
                    }
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
                
                // Generate new barcode based on updated bag data
                const newCode = generateBagProductCode(updatedBag, good.color);
                
                await Goods.updateOne(
                    { _id: good._id },
                    { 
                        $set: { 
                            bagProduct: req.body.Torebki_Kod,
                            fullName: newFullName,
                            code: newCode // Update barcode
                        } 
                    }
                );

                // Log goods update to history
                const goodsHistoryEntry = new History({
                    collectionName: 'Towary',
                    operation: 'Aktualizacja kodu kreskowego i nazwy produktu',
                    product: newFullName,
                    details: `Produkt zaktualizowany ze względu na zmianę kodu torebki. Nowa nazwa: "${newFullName}", nowy kod kreskowy: "${newCode}"`,
                    userloggedinId: req.user ? req.user._id : null,
                    timestamp: new Date()
                });
                await goodsHistoryEntry.save();
            }

            // Synchronize price lists after updating goods
            if (goodsToUpdate.length > 0) {
                try {
                    const token = req.headers.authorization;
                    await axios.post(`${config.domain || 'http://localhost:3000'}/api/pricelists/sync-all`, {
                        updateOutdated: true,
                        addNew: false,
                        removeDeleted: false,
                        updatePrices: false // TYLKO NAZWY, nie ceny
                    }, {
                        headers: {
                            Authorization: token
                        }
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
