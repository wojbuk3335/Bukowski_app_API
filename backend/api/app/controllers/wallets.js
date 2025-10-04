const Wallets = require('../db/models/wallets');
const mongoose = require('mongoose');

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