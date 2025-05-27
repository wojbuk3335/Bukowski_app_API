const Transfer = require("../db/models/transfer");

exports.createTransfer = async (req, res) => {
    try {
        const { productId, fullName, size, from, to } = req.body;

        // Check if the product has already been transferred
        const existingTransfer = await Transfer.findOne({ productId });
        if (existingTransfer) {
            return res.status(400).json({ message: "Produkt został już przepisany."});
        }

        const transfer = new Transfer({ productId, fullName, size, from, to });
        await transfer.save();
        res.status(201).json(transfer);
    } catch (error) {
        console.error("Error creating transfer:", error); // Log the error for debugging
        res.status(500).json({ message: "Error creating transfer", error: error.message });
    }
};

exports.getTransfersByAccount = async (req, res) => {
    try {
        const { accountSymbol } = req.params;
        const transfers = await Transfer.find({
            $or: [{ from: accountSymbol }, { to: accountSymbol }],
        });
        res.status(200).json(transfers);
    } catch (error) {
        res.status(500).json({ message: "Error fetching transfers", error: error.message });
    }
};

exports.deleteTransfer = async (req, res) => {
    try {
        const { id } = req.params;
        const transfer = await Transfer.findByIdAndDelete(id);
        if (!transfer) {
            return res.status(404).json({ message: "Transfer not found" });
        }
        res.status(200).json({ message: "Transfer deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting transfer", error: error.message });
    }
};

exports.deleteAllTransfers = async (req, res) => {
    try {
        const result = await Transfer.deleteMany({});
        res.status(200).json({ message: "All transfers deleted successfully", deletedCount: result.deletedCount });
    } catch (error) {
        res.status(500).json({ message: "Error deleting all transfers", error: error.message });
    }
};

exports.cancelTransfer = async (req, res) => {
    try {
        const { id } = req.params;
        const transfer = await Transfer.findByIdAndDelete(id);
        if (!transfer) {
            return res.status(404).json({ message: "Transfer not found" });
        }
        res.status(200).json({ message: "Transfer canceled successfully", transfer });
    } catch (error) {
        console.error("Error canceling transfer:", error);
        res.status(500).json({ message: "Error canceling transfer", error: error.message });
    }
};
