const TransactionHistory = require('../db/models/transactionHistory');

// Get all active transaction history entries
const getTransactionHistory = async (req, res) => {
    try {
        const history = await TransactionHistory.find({ isActive: true })
            .sort({ timestamp: -1 })
            .limit(50); // Limit to last 50 transactions
        
        res.status(200).json(history);
    } catch (error) {
        console.error('Error fetching transaction history:', error);
        res.status(500).json({ error: 'Failed to fetch transaction history' });
    }
};

// Save a new transaction to history
const saveTransaction = async (req, res) => {
    try {
        const {
            transactionId,
            operationType,
            selectedSellingPoint,
            targetSellingPoint,
            targetSymbol,
            processedItems,
            itemsCount,
            isCorrection,
            originalTransactionId,
            hasCorrections,
            lastModified
        } = req.body;

        const newTransaction = new TransactionHistory({
            transactionId,
            operationType,
            selectedSellingPoint,
            targetSellingPoint,
            targetSymbol,
            processedItems,
            itemsCount,
            userloggedinId: null, // Since we don't require auth, set to null
            isCorrection: isCorrection || false,
            originalTransactionId,
            hasCorrections: hasCorrections || false,
            lastModified
        });

        await newTransaction.save();
        
        res.status(201).json({
            message: 'Transaction saved to history successfully',
            transaction: newTransaction
        });
    } catch (error) {
        console.error('Error saving transaction to history:', error);
        res.status(500).json({ error: 'Failed to save transaction to history' });
    }
};

// Mark a transaction as inactive (soft delete)
const deactivateTransaction = async (req, res) => {
    try {
        const { transactionId } = req.params;
        
        const transaction = await TransactionHistory.findOneAndUpdate(
            { transactionId, isActive: true },
            { isActive: false },
            { new: true }
        );

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found or already deactivated' });
        }

        res.status(200).json({
            message: 'Transaction deactivated successfully',
            transaction
        });
    } catch (error) {
        console.error('Error deactivating transaction:', error);
        res.status(500).json({ error: 'Failed to deactivate transaction' });
    }
};

// Get a specific transaction by ID
const getTransactionById = async (req, res) => {
    try {
        const { transactionId } = req.params;
        
        const transaction = await TransactionHistory.findOne({
            transactionId,
            isActive: true
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        res.status(200).json(transaction);
    } catch (error) {
        console.error('Error fetching transaction:', error);
        res.status(500).json({ error: 'Failed to fetch transaction' });
    }
};

// Clear old transactions (older than 30 days)
const clearOldTransactions = async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const result = await TransactionHistory.updateMany(
            { 
                timestamp: { $lt: thirtyDaysAgo },
                isActive: true 
            },
            { isActive: false }
        );

        res.status(200).json({
            message: `${result.modifiedCount} old transactions cleared`,
            clearedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('Error clearing old transactions:', error);
        res.status(500).json({ error: 'Failed to clear old transactions' });
    }
};

// Update a transaction
const updateTransaction = async (req, res) => {
    try {
        const { transactionId } = req.params;
        const updateData = req.body;
        
        const transaction = await TransactionHistory.findOneAndUpdate(
            { transactionId, isActive: true },
            updateData,
            { new: true }
        );

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found or already deactivated' });
        }

        res.status(200).json({
            message: 'Transaction updated successfully',
            transaction
        });
    } catch (error) {
        console.error('Error updating transaction:', error);
        res.status(500).json({ error: 'Failed to update transaction' });
    }
};

module.exports = {
    getTransactionHistory,
    saveTransaction,
    updateTransaction,
    deactivateTransaction,
    getTransactionById,
    clearOldTransactions
};
