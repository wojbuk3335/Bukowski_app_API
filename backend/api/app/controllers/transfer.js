const Transfer = require('../db/models/transfer');

class TransferController {
    createTransfer = async (req, res) => {
        try {
            const transfer = new Transfer(req.body);
            await transfer.save();
            res.status(201).json(transfer);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    };

    getTransfers = async (req, res) => {
        try {
            const transfers = await Transfer.find();
            res.status(200).json(transfers);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    };

    getTransferById = async (req, res) => {
        try {
            const transfer = await Transfer.findById(req.params.id);
            if (!transfer) {
                return res.status(404).json({ message: 'Transfer not found' });
            }
            res.status(200).json(transfer);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    };

    updateTransfer = async (req, res) => {
        try {
            const transfer = await Transfer.findByIdAndUpdate(req.params.id, req.body, { new: true });
            if (!transfer) {
                return res.status(404).json({ message: 'Transfer not found' });
            }
            res.status(200).json(transfer);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    };

    deleteTransfer = async (req, res) => {
        try {
            const transfer = await Transfer.findByIdAndDelete(req.params.id);
            if (!transfer) {
                return res.status(404).json({ message: 'Transfer not found' });
            }
            res.status(200).json({ message: 'Transfer deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    };

    cancelTransfer = async (req, res) => {
        try {
            const transfer = await Transfer.findById(req.params.id);
            if (!transfer) {
                return res.status(404).json({ message: 'Transfer not found' });
            }
            transfer.transfer_from = null;
            transfer.transfer_to = null;
            await transfer.save();
            res.status(200).json(transfer);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    };

    deleteAllTransfers = async (req, res) => {
        try {
            await Transfer.deleteMany({});
            res.status(200).json({ message: 'All transfers deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    };

    deleteTransferByProductId = async (req, res) => {
        try {
            console.log("Received productId for deletion:", req.params.productId); // Log productId for debugging

            const transfer = await Transfer.deleteByProductId(req.params.productId); // Use deleteByProductId method
            if (!transfer) {
                console.log("Transfer not found for productId:", req.params.productId); // Log if transfer not found
                return res.status(404).json({ message: 'Transfer not found' });
            }
            res.status(200).json({ message: 'Transfer deleted successfully' });
        } catch (error) {
            console.error("Error deleting transfer:", error);
            res.status(500).json({ error: error.message });
        }
    };
}

module.exports = new TransferController();
