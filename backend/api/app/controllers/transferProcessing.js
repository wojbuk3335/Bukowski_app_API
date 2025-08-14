const Transfer = require('../db/models/transfer');
const State = require('../db/models/state');
const History = require('../db/models/history');
const mongoose = require('mongoose');

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
}

module.exports = new TransferProcessingController();
