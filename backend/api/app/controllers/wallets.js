const Wallets = require('../db/models/wallets');
const Goods = require('../db/models/goods');
const History = require('../db/models/history');
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

// Helper function to generate wallet product code
const generateWalletProductCode = (walletData, colorData) => {
    if (!walletData || !colorData) {
        return '';
    }

    // Format: 000 + kolor(2) + wiersz(4) + po_kropce(3) + suma_kontrolna(1)
    let code = '000';
    
    // Pozycje 4-5: Kod koloru (Kol_Kod)
    const colorCode = colorData.Kol_Kod || '00';
    code += colorCode.padStart(2, '0').substring(0, 2);
    
    // Pozycje 6-9: Numer wiersza (Portfele_Nr) - 4 cyfry
    const rowNumber = walletData.Portfele_Nr || 0;
    code += rowNumber.toString().padStart(4, '0').substring(0, 4);
    
    // Pozycje 10-12: Wartość po kropce z Portfele_Kod
    const walletCode = walletData.Portfele_Kod || '';
    const afterDotMatch = walletCode.match(/\.(\d{3})/); // Znajdź 3 cyfry po kropce
    const afterDotValue = afterDotMatch ? afterDotMatch[1] : '000';
    code += afterDotValue.padStart(3, '0').substring(0, 3);
    
    // Pozycja 13: Suma kontrolna
    const controlSum = calculateControlSum(code);
    code += controlSum;
    
    return code;
};

// Get all wallets
exports.getAllWallets = async (req, res, next) => {
    try {
        const wallets = await Wallets.find();
        res.status(200).json({
            wallets: wallets
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Insert many Wallets
exports.insertManyWallets = async (req, res, next) => {
    try {
        // Check for duplicates
        for (const walletItem of req.body) {
            if (walletItem.Portfele_Nr) {
                const existingWallet = await Wallets.findOne({ Portfele_Nr: walletItem.Portfele_Nr });
                if (existingWallet) {
                    return res.status(400).json({
                        message: `Wallet with Portfele_Nr ${walletItem.Portfele_Nr} already exists`
                    });
                }
            }
        }

        // Add _id to each item if not present
        const itemsWithIds = req.body.map(walletItem => ({
            ...walletItem,
            _id: walletItem._id || new mongoose.Types.ObjectId()
        }));

        const result = await Wallets.insertMany(itemsWithIds);
        
        // Log to history
        for (const walletItem of result) {
            const historyEntry = new History({
                collectionName: 'Portfele',
                operation: 'Utworzenie',
                product: '-',
                details: `Dodano nowy portfel: ${walletItem.Portfele_Kod || 'Nieznany kod'}`,
                userloggedinId: req.user ? req.user._id : null,
                timestamp: new Date()
            });
            await historyEntry.save();
        }
        
        res.status(201).json({
            message: "Wallets inserted successfully",
            Wallets: result
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update many Wallets
exports.updateManyWallets = async (req, res, next) => {
    try {
        const updatePromises = req.body.map(walletItem => {
            return Wallets.findByIdAndUpdate(
                walletItem._id,
                { 
                    Portfele_Nr: walletItem.Portfele_Nr,
                    Portfele_Kod: walletItem.Portfele_Kod
                },
                { new: true }
            );
        });

        const results = await Promise.all(updatePromises);
        
        // Log to history and synchronize with goods
        for (let i = 0; i < results.length; i++) {
            const walletItem = results[i];
            const requestItem = req.body[i];
            
            if (walletItem) {
                const historyEntry = new History({
                    collectionName: 'Portfele',
                    operation: 'Aktualizacja',
                    product: '-',
                    details: `Kod portfela został zmieniony na ${walletItem.Portfele_Kod || 'brak'}`,
                    userloggedinId: req.user ? req.user._id : null,
                    timestamp: new Date()
                });
                await historyEntry.save();

                // Synchronize with goods table
                try {
                    const walletId = walletItem._id.toString();
                    const relatedGoods = await Goods.find({ 
                        category: 'Portfele',
                        bagId: walletId 
                    });
                    
                    if (relatedGoods.length > 0) {
                        // Update bagProduct for all related goods
                        await Goods.updateMany(
                            { 
                                category: 'Portfele',
                                bagId: walletId 
                            },
                            { 
                                $set: { 
                                    bagProduct: walletItem.Portfele_Kod
                                }
                            }
                        );
                        
                        // Update fullName and code for each item individually
                        for (const good of relatedGoods) {
                            // Find old wallet name from the request to know what to replace
                            const oldWalletName = good.bagProduct; // Current bagProduct value
                            const newWalletName = walletItem.Portfele_Kod;
                            
                            if (oldWalletName && newWalletName && oldWalletName !== newWalletName) {
                                // Populate color data for barcode generation
                                await good.populate('color');
                                
                                const oldFullName = good.fullName;
                                const oldCode = good.code;
                                const newFullName = oldFullName.replace(oldWalletName, newWalletName);
                                
                                // Generate new barcode based on updated wallet data
                                const newCode = generateWalletProductCode(walletItem, good.color);
                                
                                if (newFullName !== oldFullName || newCode !== oldCode) {
                                    await Goods.findByIdAndUpdate(good._id, { 
                                        fullName: newFullName,
                                        code: newCode
                                    });
                                    
                                    // Log goods update to history
                                    const goodsHistoryEntry = new History({
                                        collectionName: 'Towary',
                                        operation: 'Automatyczna aktualizacja',
                                        product: newFullName,
                                        details: `Nazwa portfela zaktualizowana automatycznie z "${oldFullName}" na "${newFullName}" po zmianie w tabeli portfeli`,
                                        userloggedinId: req.user ? req.user._id : null,
                                        timestamp: new Date()
                                    });
                                    await goodsHistoryEntry.save();
                                }
                            }
                        }
                    }
                } catch (syncError) {
                    console.error('❌ Error synchronizing wallet with goods:', syncError.message);
                }
            }
        }

        // Trigger price list synchronization for all changes
        if (results.length > 0) {
            try {
                const token = req.headers.authorization;
                await axios.post(`${config.domain || 'http://localhost:3000'}/api/pricelists/sync-all`, {
                    updateOutdated: true,
                    addNew: false,
                    removeDeleted: false,
                    updatePrices: false // Don't update prices, just names
                }, {
                    headers: {
                        Authorization: token
                    }
                });
            } catch (syncError) {
                console.error('❌ Error synchronizing price lists:', syncError.message);
            }
        }
        
        res.status(200).json({
            message: "Wallets updated successfully",
            Wallets: results
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update single Wallets
exports.updateWallets = async (req, res, next) => {
    try {
        const id = req.params.id;
        
        // Get old wallet data before update
        const oldWallet = await Wallets.findById(id);
        if (!oldWallet) {
            return res.status(404).json({ message: "Wallet not found" });
        }
        
        // Check for duplicate Portfele_Nr (excluding current Wallets)
        if (req.body.Portfele_Nr) {
            const existingWallets = await Wallets.findOne({ 
                Portfele_Nr: req.body.Portfele_Nr,
                _id: { $ne: id }
            });
            if (existingWallets) {
                return res.status(400).json({
                    message: `Wallet with Portfele_Nr ${req.body.Portfele_Nr} already exists`
                });
            }
        }

        const updatedWallet = await Wallets.findByIdAndUpdate(
            id,
            { 
                Portfele_Nr: req.body.Portfele_Nr,
                Portfele_Kod: req.body.Portfele_Kod
            },
            { new: true }
        );

        if (!updatedWallet) {
            return res.status(404).json({ message: "Wallet not found" });
        }

        // Log to history with changes comparison
        let changes = [];
        
        // Compare Portfele_Kod
        if (req.body.Portfele_Kod !== undefined && oldWallet.Portfele_Kod !== req.body.Portfele_Kod) {
            changes.push(`Kod portfela został zmieniony z ${oldWallet.Portfele_Kod || 'brak'} na ${req.body.Portfele_Kod || 'brak'}`);
        }
        
        // Compare Portfele_Nr
        if (req.body.Portfele_Nr !== undefined && oldWallet.Portfele_Nr !== req.body.Portfele_Nr) {
            changes.push(`Numer portfela został zmieniony z ${oldWallet.Portfele_Nr || 'brak'} na ${req.body.Portfele_Nr || 'brak'}`);
        }
        
        const details = changes.length > 0 ? changes.join(', ') : 'Brak zmian w portfelu';
        
        const historyEntry = new History({
            collectionName: 'Portfele',
            operation: 'Aktualizacja',
            product: '-',
            details: details,
            userloggedinId: req.user ? req.user._id : null,
            timestamp: new Date()
        });
        await historyEntry.save();

        // Synchronize with goods table if Portfele_Kod changed
        if (req.body.Portfele_Kod !== undefined && oldWallet.Portfele_Kod !== req.body.Portfele_Kod) {
            try {
                // Find all goods that reference this wallet by bagId
                const walletId = updatedWallet._id.toString();
                const relatedGoods = await Goods.find({ 
                    category: 'Portfele',
                    bagId: walletId 
                });
                
                
                if (relatedGoods.length > 0) {
                    // Update bagProduct and fullName for all related goods
                    const updateResult = await Goods.updateMany(
                        { 
                            category: 'Portfele',
                            bagId: walletId 
                        },
                        { 
                            $set: { 
                                bagProduct: req.body.Portfele_Kod,
                                // Update fullName by replacing the old wallet name with new one
                            }
                        }
                    );
                    
                    
                    // Update fullName and code for each item individually (since it might contain additional info like color)
                    for (const good of relatedGoods) {
                        // Populate color data for barcode generation
                        await good.populate('color');
                        
                        const oldFullName = good.fullName;
                        const oldCode = good.code;
                        const newFullName = oldFullName.replace(oldWallet.Portfele_Kod, req.body.Portfele_Kod);
                        
                        // Generate new barcode based on updated wallet data
                        const newCode = generateWalletProductCode(updatedWallet, good.color);
                        
                        if (newFullName !== oldFullName || newCode !== oldCode) {
                            await Goods.findByIdAndUpdate(good._id, { 
                                fullName: newFullName,
                                code: newCode
                            });
                            
                            // Log goods update to history
                            const goodsHistoryEntry = new History({
                                collectionName: 'Towary',
                                operation: 'Automatyczna aktualizacja kodu kreskowego i nazwy',
                                product: newFullName,
                                details: `Portfel zaktualizowany automatycznie: nazwa z "${oldFullName}" na "${newFullName}", kod kreskowy z "${oldCode}" na "${newCode}"`,
                                userloggedinId: req.user ? req.user._id : null,
                                timestamp: new Date()
                            });
                            await goodsHistoryEntry.save();
                            
                                                        
                        }
                    }
                    
                    // Trigger price list synchronization
                    try {
                        const token = req.headers.authorization;
                        await axios.post(`${config.domain || 'http://localhost:3000'}/api/pricelists/sync-all`, {
                            updateOutdated: true,
                            addNew: false,
                            removeDeleted: false,
                            updatePrices: false // Don't update prices, just names
                        }, {
                            headers: {
                                Authorization: token
                            }
                        });
                    } catch (syncError) {
                        console.error('❌ Error synchronizing price lists:', syncError.message);
                    }
                }
            } catch (syncError) {
                console.error('❌ Error synchronizing wallet with goods:', syncError.message);
                // Don't fail the wallet update if synchronization fails
            }
        }

        res.status(200).json({
            message: "Wallet updated successfully",
            wallet: updatedWallet
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete single Wallets
exports.deleteWallets = async (req, res, next) => {
    try {
        const id = req.params.id;
        const deletedWallet = await Wallets.findByIdAndDelete(id);

        if (!deletedWallet) {
            return res.status(404).json({ message: "Wallet not found" });
        }

        res.status(200).json({
            message: "Wallet deleted successfully",
            wallet: deletedWallet
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete all Wallets
exports.deleteAllWallets = async (req, res, next) => {
    try {
        const result = await Wallets.deleteMany({});
        res.status(200).json({
            message: "All Wallets deleted successfully",
            deletedCount: result.deletedCount
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};