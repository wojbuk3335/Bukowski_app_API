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
            // Return ALL transfers (processed and unprocessed) - let frontend handle display
            const transfers = await Transfer.find();
            res.status(200).json(transfers);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    };

    // DEBUG: Get ALL transfers including processed ones
    getAllTransfersDebug = async (req, res) => {
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

    // TEMPORARY: Delete transfer by _id to remove duplicates
    deleteTransferById = async (req, res) => {
        try {
            console.log("Received _id for deletion:", req.params.id);

            const transfer = await Transfer.findByIdAndDelete(req.params.id);
            if (!transfer) {
                console.log("Transfer not found for _id:", req.params.id);
                return res.status(404).json({ message: 'Transfer not found' });
            }
            res.status(200).json({ message: 'Transfer deleted successfully', deletedTransfer: transfer });
        } catch (error) {
            console.error("Error deleting transfer by _id:", error);
            res.status(500).json({ error: error.message });
        }
    };

    // New method to manage indexes
    manageIndexes = async (req, res) => {
        try {
            const collection = Transfer.collection;
            
            // Get current indexes
            const indexes = await collection.indexes();
            console.log("Current indexes:", JSON.stringify(indexes, null, 2));
            
            // Drop old unique index on productId if it exists
            try {
                await collection.dropIndex("productId_1");
                console.log("Dropped old productId_1 index");
            } catch (error) {
                console.log("productId_1 index not found or already dropped:", error.message);
            }
            
            // Ensure compound index exists
            try {
                await collection.createIndex(
                    { productId: 1, dateString: 1 }, 
                    { unique: true, name: "productId_dateString_unique" }
                );
                console.log("Created compound index productId_dateString_unique");
            } catch (error) {
                console.log("Compound index already exists or error creating:", error.message);
            }
            
            // Get indexes after changes
            const newIndexes = await collection.indexes();
            
            res.status(200).json({
                message: "Index management completed",
                oldIndexes: indexes,
                newIndexes: newIndexes
            });
        } catch (error) {
            console.error("Error managing indexes:", error);
            res.status(500).json({ error: error.message });
        }
    };
}

module.exports = new TransferController();
