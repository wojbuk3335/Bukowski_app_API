const Transfer = require('../db/models/transfer');
const State = require('../db/models/state');
const History = require('../db/models/history');
const mongoose = require('mongoose');

// Helper function to generate transaction ID
const generateTransactionId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

class TransferProcessingController {
    // Process all transfers - remove items from state based on transfers
    async processAllTransfers(req, res) {
        try {
            const { transfers, selectedDate, selectedUser } = req.body;
            
            if (!transfers || !Array.isArray(transfers) || transfers.length === 0) {
                return res.status(400).json({
                    message: 'No transfers provided for processing'
                });
            }

            let processedCount = 0;
            const errors = [];
            const transactionId = generateTransactionId(); // Generate unique transaction ID
            const removedItems = []; // Store removed items for response

            // Process each transfer
            for (const transfer of transfers) {
                try {
                    // Find items in state that match this transfer by ID
                    const stateItems = await State.find({
                        _id: transfer.productId // Match by MongoDB _id
                    }).populate('fullName', 'fullName')
                      .populate('size', 'Roz_Opis')
                      .populate('sellingPoint', 'symbol');

                    // Filter items by transfer_from symbol
                    const matchingItems = stateItems.filter(item => 
                        item.sellingPoint && item.sellingPoint.symbol === transfer.transfer_from
                    );

                    if (matchingItems.length > 0) {
                        // Remove the first matching item (you can modify logic to remove multiple)
                        const itemToRemove = matchingItems[0];
                        
                        // Store complete item data for potential restoration
                        const itemData = {
                            originalId: itemToRemove._id,
                            fullName: itemToRemove.fullName._id,
                            fullNameText: itemToRemove.fullName?.fullName || 'Nieznany produkt',
                            size: itemToRemove.size._id,
                            sizeText: itemToRemove.size?.Roz_Opis || 'Nieznany rozmiar',
                            barcode: itemToRemove.barcode,
                            sellingPoint: itemToRemove.sellingPoint._id,
                            sellingPointSymbol: itemToRemove.sellingPoint?.symbol,
                            price: itemToRemove.price,
                            discount_price: itemToRemove.discount_price,
                            date: itemToRemove.date,
                            transferData: transfer
                        };

                        // Create history entry with complete restoration data
                        const historyEntry = new History({
                            collectionName: 'Stan',
                            operation: 'Odpisano ze stanu (transfer)',
                            product: `${itemData.fullNameText} ${itemData.sizeText}`,
                            details: JSON.stringify(itemData), // Store complete item data as JSON
                            userloggedinId: req.user ? req.user._id : null,
                            from: transfer.transfer_from,
                            to: transfer.transfer_to,
                            transactionId: transactionId
                        });

                        await historyEntry.save();

                        // Remove item from state
                        await State.findByIdAndDelete(itemToRemove._id);
                        
                        removedItems.push(itemData);
                        processedCount++;
                    }

                    // Remove transfer after processing
                    await Transfer.findByIdAndDelete(transfer._id);

                } catch (transferError) {
                    console.error(`Error processing transfer ${transfer._id}:`, transferError);
                    errors.push(`Transfer ${transfer._id}: ${transferError.message}`);
                }
            }

            res.status(200).json({
                message: 'Transfers processed successfully',
                processedCount: processedCount,
                totalTransfers: transfers.length,
                transactionId: transactionId,
                removedItems: removedItems,
                errors: errors.length > 0 ? errors : undefined
            });

        } catch (error) {
            console.error('Error processing all transfers:', error);
            res.status(500).json({
                message: 'Failed to process transfers',
                error: error.message
            });
        }
    }

    // Process single transfer
    async processSingleTransfer(req, res) {
        try {
            const { transferId } = req.body;

            if (!transferId) {
                return res.status(400).json({
                    message: 'Transfer ID is required'
                });
            }

            // Find the transfer
            const transfer = await Transfer.findById(transferId);
            if (!transfer) {
                return res.status(404).json({
                    message: 'Transfer not found'
                });
            }

            // Find items in state that match this transfer by ID
            const stateItems = await State.find({
                _id: transfer.productId // Match by MongoDB _id
            }).populate('fullName', 'fullName')
              .populate('size', 'Roz_Opis')
              .populate('sellingPoint', 'symbol');

            // Filter items by transfer_from symbol
            const matchingItems = stateItems.filter(item => 
                item.sellingPoint && item.sellingPoint.symbol === transfer.transfer_from
            );

            if (matchingItems.length === 0) {
                return res.status(404).json({
                    message: 'No matching items found in state for this transfer'
                });
            }

            // Remove the first matching item
            const itemToRemove = matchingItems[0];
            
            // Create history entry
            const historyEntry = new History({
                collectionName: 'Stan',
                operation: 'Odpisano ze stanu (transfer)',
                product: `${itemToRemove.fullName?.fullName || 'Nieznany produkt'} ${itemToRemove.size?.Roz_Opis || 'Nieznany rozmiar'}`,
                details: `Odpisano produkt ze stanu na podstawie transferu z ${transfer.transfer_from} do ${transfer.transfer_to}`,
                userloggedinId: req.user ? req.user._id : null,
                from: transfer.transfer_from,
                to: transfer.transfer_to
            });

            await historyEntry.save();

            // Remove item from state
            await State.findByIdAndDelete(itemToRemove._id);

            // Remove transfer after processing
            await Transfer.findByIdAndDelete(transferId);

            res.status(200).json({
                message: 'Transfer processed successfully',
                removedItem: {
                    id: itemToRemove._id,
                    fullName: itemToRemove.fullName?.fullName,
                    size: itemToRemove.size?.Roz_Opis,
                    barcode: itemToRemove.barcode,
                    symbol: itemToRemove.sellingPoint?.symbol
                }
            });

        } catch (error) {
            console.error('Error processing single transfer:', error);
            res.status(500).json({
                message: 'Failed to process transfer',
                error: error.message
            });
        }
    }

    // Undo last transaction - restore items to state with original IDs
    async undoLastTransaction(req, res) {
        try {
            // Find the most recent transaction
            const lastTransaction = await History.findOne({
                operation: 'Odpisano ze stanu (transfer)',
                transactionId: { $exists: true, $ne: null }
            }).sort({ timestamp: -1 });

            if (!lastTransaction) {
                return res.status(404).json({
                    message: 'No recent transaction found to undo'
                });
            }

            // Find all history entries for this transaction
            const transactionEntries = await History.find({
                transactionId: lastTransaction.transactionId
            });

            if (transactionEntries.length === 0) {
                return res.status(404).json({
                    message: 'No transaction entries found'
                });
            }

            const restoredItems = [];
            const errors = [];

            // Restore each item
            for (const entry of transactionEntries) {
                try {
                    // Parse the stored item data
                    const itemData = JSON.parse(entry.details);
                    
                    // Create new State document with original ID
                    const restoredItem = new State({
                        _id: new mongoose.Types.ObjectId(itemData.originalId),
                        fullName: itemData.fullName,
                        size: itemData.size,
                        barcode: itemData.barcode,
                        sellingPoint: itemData.sellingPoint,
                        price: itemData.price,
                        discount_price: itemData.discount_price,
                        date: itemData.date
                    });

                    await restoredItem.save();

                    // Recreate transfer entry so it appears in the list again
                    const currentDate = new Date();
                    const recreatedTransfer = new Transfer({
                        fullName: itemData.fullNameText,
                        size: itemData.sizeText,
                        date: currentDate, // Use current date so it appears in today's transfers
                        dateString: currentDate.toISOString().split('T')[0], // Add required dateString field
                        transfer_from: itemData.transferData.transfer_from,
                        transfer_to: itemData.transferData.transfer_to,
                        productId: itemData.originalId,
                        reason: itemData.transferData.reason || 'Przywrócony po cofnięciu',
                        advancePayment: itemData.transferData.advancePayment || 0,
                        advancePaymentCurrency: itemData.transferData.advancePaymentCurrency || 'PLN'
                    });

                    await recreatedTransfer.save();

                    // Create restoration history entry
                    const restorationEntry = new History({
                        collectionName: 'Stan',
                        operation: 'Przywrócono do stanu (cofnięcie transferu)',
                        product: `${itemData.fullNameText} ${itemData.sizeText}`,
                        details: `Przywrócono produkt do stanu - cofnięcie transakcji ${lastTransaction.transactionId}`,
                        userloggedinId: req.user ? req.user._id : null,
                        from: entry.to,
                        to: entry.from,
                        transactionId: `UNDO_${lastTransaction.transactionId}`
                    });

                    await restorationEntry.save();

                    restoredItems.push({
                        id: itemData.originalId,
                        fullName: itemData.fullNameText,
                        size: itemData.sizeText,
                        barcode: itemData.barcode,
                        sellingPoint: itemData.sellingPointSymbol
                    });

                } catch (itemError) {
                    console.error(`Error restoring item:`, itemError);
                    errors.push(`Item restoration error: ${itemError.message}`);
                }
            }

            // Mark original transaction as undone by updating operation
            await History.updateMany(
                { transactionId: lastTransaction.transactionId },
                { operation: 'Odpisano ze stanu (transfer) - COFNIĘTE' }
            );

            res.status(200).json({
                message: 'Transaction successfully undone',
                transactionId: lastTransaction.transactionId,
                restoredCount: restoredItems.length,
                restoredItems: restoredItems,
                errors: errors.length > 0 ? errors : undefined
            });

        } catch (error) {
            console.error('Error undoing transaction:', error);
            res.status(500).json({
                message: 'Failed to undo transaction',
                error: error.message
            });
        }
    }

    // Get last transaction info
    async getLastTransaction(req, res) {
        try {
            console.log('Getting last transaction...'); // Debug log
            
            const lastTransaction = await History.findOne({
                operation: 'Odpisano ze stanu (transfer)',
                transactionId: { $exists: true, $ne: null }
            }).sort({ timestamp: -1 });

            console.log('Last transaction found:', lastTransaction); // Debug log

            if (!lastTransaction) {
                console.log('No transaction found - returning 404'); // Debug log
                return res.status(404).json({
                    message: 'No recent transaction found'
                });
            }

            // Count items in this transaction
            const transactionCount = await History.countDocuments({
                transactionId: lastTransaction.transactionId,
                operation: 'Odpisano ze stanu (transfer)'
            });

            console.log('Transaction count:', transactionCount); // Debug log

            res.status(200).json({
                transactionId: lastTransaction.transactionId,
                timestamp: lastTransaction.timestamp,
                itemCount: transactionCount,
                canUndo: true
            });

        } catch (error) {
            console.error('Error getting last transaction:', error);
            res.status(500).json({
                message: 'Failed to get last transaction info',
                error: error.message
            });
        }
    }
}

module.exports = new TransferProcessingController();
