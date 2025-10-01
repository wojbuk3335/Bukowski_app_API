const Wallet = require('../db/models/wallet');

// Get all wallets
exports.getAllWallets = async (req, res, next) => {
    try {
        const wallets = await Wallet.find();
        res.status(200).json({
            wallets: wallets
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Insert many wallets
exports.insertManyWallets = async (req, res, next) => {
    try {
        // Check for duplicates
        for (const wallet of req.body) {
            if (wallet.Torebki_Nr) {
                const existingWallet = await Wallet.findOne({ Torebki_Nr: wallet.Torebki_Nr });
                if (existingWallet) {
                    return res.status(400).json({
                        message: `Wallet with Torebki_Nr ${wallet.Torebki_Nr} already exists`
                    });
                }
            }
        }

        const result = await Wallet.insertMany(req.body);
        res.status(201).json({
            message: "Wallets inserted successfully",
            wallets: result
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update many wallets
exports.updateManyWallets = async (req, res, next) => {
    try {
        const updatePromises = req.body.map(wallet => {
            return Wallet.findByIdAndUpdate(
                wallet._id,
                { 
                    Torebki_Nr: wallet.Torebki_Nr,
                    Torebki_Kod: wallet.Torebki_Kod
                },
                { new: true }
            );
        });

        const results = await Promise.all(updatePromises);
        res.status(200).json({
            message: "Wallets updated successfully",
            wallets: results
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update single wallet
exports.updateWallet = async (req, res, next) => {
    try {
        const id = req.params.id;
        
        // Check for duplicate Torebki_Nr (excluding current wallet)
        if (req.body.Torebki_Nr) {
            const existingWallet = await Wallet.findOne({ 
                Torebki_Nr: req.body.Torebki_Nr,
                _id: { $ne: id }
            });
            if (existingWallet) {
                return res.status(400).json({
                    message: `Wallet with Torebki_Nr ${req.body.Torebki_Nr} already exists`
                });
            }
        }

        const wallet = await Wallet.findByIdAndUpdate(
            id,
            { 
                Torebki_Nr: req.body.Torebki_Nr,
                Torebki_Kod: req.body.Torebki_Kod
            },
            { new: true }
        );

        if (!wallet) {
            return res.status(404).json({ message: "Wallet not found" });
        }

        res.status(200).json({
            message: "Wallet updated successfully",
            wallet: wallet
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete single wallet
exports.deleteWallet = async (req, res, next) => {
    try {
        const id = req.params.id;
        const wallet = await Wallet.findByIdAndDelete(id);

        if (!wallet) {
            return res.status(404).json({ message: "Wallet not found" });
        }

        res.status(200).json({
            message: "Wallet deleted successfully",
            wallet: wallet
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete all wallets
exports.deleteAllWallets = async (req, res, next) => {
    try {
        const result = await Wallet.deleteMany({});
        res.status(200).json({
            message: "All wallets deleted successfully",
            deletedCount: result.deletedCount
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};