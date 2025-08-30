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
            const { transfers, selectedDate, selectedUser, transactionId } = req.body;
            
            if (!transfers || !Array.isArray(transfers) || transfers.length === 0) {
                return res.status(400).json({
                    message: 'No transfers provided for processing'
                });
            }

            let processedCount = 0;
            const errors = [];
            const finalTransactionId = transactionId || generateTransactionId(); // Use provided or generate new
            console.log('Using transactionId:', finalTransactionId);
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
                            transferData: transfer,
                            transferId: transfer._id // Store transfer ID for undo
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
                            transactionId: finalTransactionId
                        });

                        await historyEntry.save();

                        // Remove item from state
                        await State.findByIdAndDelete(itemToRemove._id);
                        
                        removedItems.push(itemData);
                        processedCount++;
                    }

                    // Mark transfer as processed instead of deleting
                    await Transfer.findByIdAndUpdate(transfer._id, {
                        processed: true,
                        processedAt: new Date()
                    });

                } catch (transferError) {
                    console.error(`Error processing transfer ${transfer._id}:`, transferError);
                    errors.push(`Transfer ${transfer._id}: ${transferError.message}`);
                }
            }

            res.status(200).json({
                message: 'Transfers processed successfully',
                processedCount: processedCount,
                totalTransfers: transfers.length,
                transactionId: finalTransactionId,
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

            // Mark transfer as processed instead of deleting
            await Transfer.findByIdAndUpdate(transferId, {
                processed: true,
                processedAt: new Date()
            });

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

    // Process sales items - remove from state with history tracking
    async processSalesItems(req, res) {
        try {
            console.log('🔄 Processing sales request received');
            console.log('Request body:', JSON.stringify(req.body, null, 2));
            
            const { salesItems, selectedUser, transactionId } = req.body;
            
            if (!salesItems || !Array.isArray(salesItems) || salesItems.length === 0) {
                console.log('❌ No sales items provided or empty array');
                return res.status(400).json({
                    message: 'No sales items provided for processing'
                });
            }

            console.log(`📊 Processing ${salesItems.length} sales items`);
            let processedCount = 0;
            const errors = [];
            const finalTransactionId = transactionId || generateTransactionId();
            console.log('Using transactionId:', finalTransactionId);

            // Process each sale
            for (const sale of salesItems) {
                try {
                    console.log(`🔍 Processing sale: ${sale.fullName}, barcode: ${sale.barcode}, from symbol: ${sale.from}`);
                    
                    // First, get the user ID for the "from" symbol
                    const User = require('../db/models/user');
                    const fromUser = await User.findOne({ symbol: sale.from });
                    if (!fromUser) {
                        console.error(`❌ User with symbol ${sale.from} not found`);
                        errors.push(`User with symbol ${sale.from} not found`);
                        continue;
                    }

                    // Find item in state that matches this barcode AND is from the correct symbol (sale.from)
                    const stateItem = await State.findOne({
                        barcode: sale.barcode,
                        sellingPoint: fromUser._id
                    }).populate('fullName', 'fullName')
                      .populate('size', 'Roz_Opis')
                      .populate('sellingPoint', 'symbol');

                    if (stateItem) {
                        console.log(`🎯 Found matching item in correct state ${sale.from}:`, stateItem.sellingPoint.symbol);
                    } else {
                        console.warn(`❌ No item found in state ${sale.from} for barcode ${sale.barcode}`);
                        errors.push(`Item ${sale.barcode} not found in state ${sale.from}`);
                        continue;
                    }

                    if (stateItem) {
                        console.log(`🎯 Found matching item in state:`, stateItem.sellingPoint.symbol);
                        
                        // Store complete item data for potential restoration
                        const itemData = {
                            originalId: stateItem._id,
                            fullName: stateItem.fullName._id,
                            fullNameText: stateItem.fullName.fullName,
                            size: stateItem.size._id,
                            sizeText: stateItem.size.Roz_Opis,
                            barcode: stateItem.barcode,
                            sellingPoint: stateItem.sellingPoint._id,
                            sellingPointSymbol: stateItem.sellingPoint.symbol,
                            price: stateItem.price,
                            discount_price: stateItem.discount_price,
                            originalFromSymbol: sale.from, // Gdzie była sprzedana
                            saleId: sale._id // ID sprzedaży
                        };

                        // Remove the item from state
                        await State.findByIdAndDelete(stateItem._id);
                        console.log(`🗑️ Removed sold item ${sale.barcode} from state (was in ${stateItem.sellingPoint.symbol})`);

                        // Add to history for potential undo
                        const historyEntry = new History({
                            collectionName: 'state', // Dodaj wymagane pole
                            operation: 'Odpisano ze stanu (sprzedaż)',
                            details: JSON.stringify(itemData),
                            timestamp: new Date(),
                            transactionId: finalTransactionId,
                            from: stateItem.sellingPoint.symbol,
                            to: 'SPRZEDANE',
                            product: `${stateItem.fullName.fullName} ${stateItem.size.Roz_Opis}`
                        });
                        await historyEntry.save();
                        console.log('📝 History entry saved for sale:', sale.barcode);

                        processedCount++;
                    } else {
                        console.warn(`⚠️ Sold item ${sale.barcode} not found in any state`);
                        errors.push(`Item ${sale.barcode} not found in state`);
                    }
                } catch (error) {
                    console.error(`Error processing sale ${sale.barcode}:`, error);
                    errors.push(`Error processing sale ${sale.barcode}: ${error.message}`);
                }
            }

            res.status(200).json({
                message: 'Sales processing completed',
                processedCount: processedCount,
                totalItems: salesItems.length,
                errors: errors,
                transactionId: finalTransactionId
            });

        } catch (error) {
            console.error('Error processing sales:', error);
            res.status(500).json({
                message: 'Failed to process sales',
                error: error.message
            });
        }
    }

    // Undo last transaction - restore items to state and DELETE original history (clean approach)
    async undoLastTransaction(req, res) {
        try {
            // Find the most recent transaction that can be undone (only active transactions)
            const lastTransaction = await History.findOne({
                $or: [
                    { operation: 'Odpisano ze stanu (transfer)' },
                    { operation: 'Dodano do stanu (z magazynu)' },
                    { operation: 'Odpisano ze stanu (sprzedaż)' },
                    { operation: 'Przeniesiono do korekt' }
                ],
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
            const User = require('../db/models/user');

            // Process each entry in the transaction
            for (const entry of transactionEntries) {
                try {
                    // Determine type of undo based on operation
                    const isWarehouseEntry = entry.operation === 'Dodano do stanu (z magazynu)';
                    const isSalesEntry = entry.operation === 'Odpisano ze stanu (sprzedaż)';
                    const isCorrectionsEntry = entry.operation === 'Przeniesiono do korekt';
                    
                    if (isWarehouseEntry) {
                        // Parse JSON details for warehouse operations
                        const itemData = JSON.parse(entry.details);
                        
                        // WAREHOUSE UNDO: Remove from user state and restore to warehouse
                        console.log('Processing warehouse undo for:', itemData.barcode);
                        
                        // Remove the item from user state
                        await State.findByIdAndDelete(itemData.stateId);
                        
                        // Restore item back to warehouse (create new document with MAGAZYN sellingPoint)
                        const warehouseUser = await User.findOne({ symbol: 'MAGAZYN' });
                        if (!warehouseUser) {
                            throw new Error('MAGAZYN user not found');
                        }

                        const warehouseItem = new State({
                            _id: new mongoose.Types.ObjectId(),
                            fullName: itemData.fullName,
                            size: itemData.size,
                            barcode: itemData.barcode,
                            sellingPoint: warehouseUser._id,
                            price: itemData.price,
                            discount_price: itemData.discount_price || 0,
                            date: new Date()
                        });

                        await warehouseItem.save();

                        restoredItems.push({
                            id: itemData.originalId,
                            fullName: itemData.fullNameText,
                            size: itemData.sizeText,
                            barcode: itemData.barcode,
                            action: 'restored_to_warehouse'
                        });

                    } else if (isSalesEntry) {
                        // Parse JSON details for sales operations
                        const itemData = JSON.parse(entry.details);
                        
                        // SALES UNDO: Restore sold item back to the state it was sold from
                        console.log('Processing sales undo for:', itemData.barcode);
                        
                        // Restore item back to the original state (symbol where it was sold from)
                        const originalUser = await User.findById(itemData.sellingPoint);
                        if (!originalUser) {
                            throw new Error(`Original selling point user not found: ${itemData.sellingPoint}`);
                        }

                        const restoredSaleItem = new State({
                            _id: new mongoose.Types.ObjectId(itemData.originalId),
                            fullName: itemData.fullName,
                            size: itemData.size,
                            barcode: itemData.barcode,
                            sellingPoint: itemData.sellingPoint,
                            price: itemData.price,
                            discount_price: itemData.discount_price || 0,
                            date: new Date()
                        });

                        await restoredSaleItem.save();
                        console.log(`✅ Restored sold item ${itemData.barcode} back to state ${originalUser.symbol}`);

                        restoredItems.push({
                            id: itemData.originalId,
                            fullName: itemData.fullNameText,
                            size: itemData.sizeText,
                            barcode: itemData.barcode,
                            action: 'restored_from_sale',
                            originalSymbol: originalUser.symbol
                        });

                    } else if (isCorrectionsEntry) {
                        // CORRECTIONS UNDO: Remove correction and RECREATE original deleted item
                        console.log('Processing corrections undo for:', entry.product);
                        
                        // Parsuj informacje o produkcie z pola product
                        const productInfo = entry.product.match(/^(.+)\s+\((.+)\)$/);
                        if (!productInfo) {
                            throw new Error(`Cannot parse product info: ${entry.product}`);
                        }
                        
                        const [, nameSizePart, barcode] = productInfo;
                        const parts = nameSizePart.split(' ');
                        const size = parts[parts.length - 1];
                        const fullName = parts.slice(0, -1).join(' ');
                        
                        // Usuń korektę z bazy danych
                        const Corrections = require('../db/models/corrections');
                        const deletedCorrection = await Corrections.findOneAndDelete({
                            barcode: barcode,
                            fullName: fullName,
                            size: size,
                            transactionId: entry.transactionId
                        });
                        
                        if (deletedCorrection) {
                            console.log(`✅ Removed correction for ${barcode}`);
                            
                            // KLUCZOWE: Odtwórz usunięty transfer/sprzedaż z oryginalnych danych
                            // Po utworzeniu korekty, oryginalny wpis został USUNIĘTY z tabeli
                            // Cofnięcie korekty = odtworzenie usuniętego wpisu z oryginalnymi danymi
                            
                            // Sprawdź czy mamy oryginalne dane w historii
                            let originalData = null;
                            if (entry.originalData) {
                                try {
                                    originalData = JSON.parse(entry.originalData);
                                } catch (e) {
                                    console.log('⚠️ Could not parse originalData from history');
                                }
                            }
                            
                            if (entry.details && (entry.details.includes('SPRZEDAŻY') || entry.details.includes('sprzedaży'))) {
                                // Odtwórz sprzedaż z oryginalnymi danymi
                                const Sales = require('../db/models/sales');
                                const recreatedSale = new Sales({
                                    _id: new mongoose.Types.ObjectId(),
                                    fullName: fullName,
                                    size: size,
                                    barcode: barcode,
                                    sellingPoint: entry.from,
                                    from: entry.from,
                                    timestamp: originalData?.timestamp || new Date(),
                                    date: originalData?.date || new Date().toISOString().split('T')[0],
                                    // Przywróć oryginalne dane finansowe jeśli dostępne
                                    cash: originalData?.price ? [{
                                        price: originalData.price,
                                        currency: 'PLN'
                                    }] : [],
                                    card: [],
                                    symbol: entry.from
                                });
                                await recreatedSale.save();
                                console.log(`✅ Recreated sale ${barcode} with original data`);
                            } else {
                                // Odtwórz transfer z oryginalnymi danymi
                                const Transfer = require('../db/models/transfer');
                                const recreatedTransfer = new Transfer({
                                    _id: new mongoose.Types.ObjectId(),
                                    fullName: fullName,
                                    size: size,
                                    productId: barcode,
                                    transfer_from: originalData?.transfer_from || entry.from,
                                    transfer_to: originalData?.transfer_to || entry.to || entry.from,
                                    date: originalData?.date || new Date(),
                                    dateString: originalData?.date ? originalData.date.split('T')[0] : new Date().toISOString().split('T')[0],
                                    processed: false,
                                    // Przywróć oryginalne dane finansowe jeśli dostępne
                                    reason: originalData?.reason || null,
                                    advancePayment: originalData?.advancePayment || 0,
                                    advancePaymentCurrency: 'PLN'
                                });
                                await recreatedTransfer.save();
                                console.log(`✅ Recreated transfer ${barcode} with original data`);
                            }
                        }
                        
                        restoredItems.push({
                            fullName: fullName,
                            size: size,
                            barcode: barcode,
                            action: 'restored_from_corrections'
                        });

                    } else {
                        // Parse JSON details for standard operations
                        const itemData = JSON.parse(entry.details);
                        
                        // STANDARD UNDO: Restore to state and mark transfer as unprocessed
                        console.log('Processing standard undo for:', itemData.barcode);
                        
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

                        // Mark transfer as unprocessed instead of creating new one
                        if (itemData.transferId) {
                            await Transfer.findByIdAndUpdate(itemData.transferId, {
                                processed: false,
                                processedAt: null
                            });
                            console.log(`✅ Transfer ${itemData.transferId} marked as unprocessed`);
                        }

                        restoredItems.push({
                            id: itemData.originalId,
                            fullName: itemData.fullNameText,
                            size: itemData.sizeText,
                            barcode: itemData.barcode,
                            action: 'restored_to_state'
                        });
                    }

                } catch (itemError) {
                    console.error(`Error undoing item:`, itemError);
                    errors.push(`Item undo error: ${itemError.message}`);
                }
            }

            // *** CLEAN APPROACH: DELETE original transaction history instead of marking as COFNIĘTE ***
            await History.deleteMany({
                transactionId: lastTransaction.transactionId
            });

            console.log(`CLEAN UNDO: Deleted ${transactionEntries.length} history entries for transaction ${lastTransaction.transactionId}`);

            res.status(200).json({
                message: 'Transaction successfully undone (history cleaned)',
                transactionId: lastTransaction.transactionId,
                restoredCount: restoredItems.length,
                restoredItems: restoredItems,
                deletedHistoryEntries: transactionEntries.length,
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

    // Process warehouse items - transfer from warehouse to user
    async processWarehouseItems(req, res) {
        try {
            const { warehouseItems, transactionId } = req.body;
            
            if (!warehouseItems || !Array.isArray(warehouseItems) || warehouseItems.length === 0) {
                return res.status(400).json({
                    message: 'No warehouse items provided for processing'
                });
            }

            const User = require('../db/models/user');
            const Goods = require('../db/models/goods'); 
            const Size = require('../db/models/size');

            const finalTransactionId = transactionId || generateTransactionId();
            console.log('Warehouse using transactionId:', finalTransactionId);
            const addedItems = [];
            const errors = [];
            
            for (const item of warehouseItems) {
                try {
                    console.log('Processing warehouse item:', item);
                    
                    // Find user
                    const user = await User.findOne({ symbol: item.transfer_to });
                    console.log('Found user:', user ? user.symbol : 'NOT FOUND');
                    
                    if (!user) {
                        errors.push(`User with symbol ${item.transfer_to} not found`);
                        continue;
                    }
                    
                    const goods = await Goods.findOne({ fullName: item.fullName });
                    const size = await Size.findOne({ Roz_Opis: item.size });

                    console.log('Found goods:', goods ? goods._id : 'NOT FOUND');
                    console.log('Found size:', size ? size._id : 'NOT FOUND');

                    if (!goods || !size) {
                        errors.push(`Product or size not found for ${item.fullName} ${item.size}`);
                        continue;
                    }

                    // Remove from warehouse (original warehouse item)
                    console.log(`🏪 REMOVING from warehouse: ${item._id} (${item.barcode})`);
                    const removedFromWarehouse = await State.findByIdAndDelete(item._id);
                    
                    if (!removedFromWarehouse) {
                        errors.push(`Warehouse item ${item._id} not found in database`);
                        continue;
                    }
                    console.log(`✅ REMOVED from warehouse: ${item._id}`);

                    // Check current count for this user BEFORE adding
                    const currentCountBefore = await State.countDocuments({ sellingPoint: user._id });
                    console.log(`📊 Current state count for ${user.symbol} BEFORE adding: ${currentCountBefore}`);

                    // Create new State document for user
                    const newStateId = new mongoose.Types.ObjectId();
                    console.log(`➕ CREATING new state item: ${newStateId} for ${user.symbol} (${item.barcode})`);
                    
                    const newStateItem = new State({
                        _id: newStateId,
                        fullName: goods._id,
                        size: size._id,
                        barcode: item.barcode,
                        sellingPoint: user._id,
                        price: item.price || 0,
                        discount_price: item.discount_price || 0,
                        date: new Date()
                    });

                    await newStateItem.save();
                    console.log(`✅ SAVED new state item: ${newStateId}`);
                    
                    // Check current count for this user AFTER adding
                    const currentCountAfter = await State.countDocuments({ sellingPoint: user._id });
                    console.log(`📊 Current state count for ${user.symbol} AFTER adding: ${currentCountAfter}`);

                    // Create history entry
                    const historyEntry = new History({
                        collectionName: 'Stan',
                        operation: 'Dodano do stanu (z magazynu)',
                        product: `${item.fullName} ${item.size}`,
                        details: JSON.stringify({
                            originalId: item._id,
                            stateId: newStateItem._id,
                            fullName: goods._id,
                            fullNameText: item.fullName,
                            size: size._id,
                            sizeText: item.size,
                            barcode: item.barcode,
                            sellingPoint: user._id,
                            sellingPointSymbol: user.symbol,
                            price: item.price || 0,
                            discount_price: item.discount_price || 0,
                            date: newStateItem.date,
                            transferData: {
                                transfer_from: 'MAGAZYN',
                                transfer_to: item.transfer_to,
                                reason: 'Przeniesienie z magazynu'
                            },
                            fromWarehouse: true
                        }),
                        userloggedinId: req.user ? req.user._id : null,
                        from: 'MAGAZYN',
                        to: user.symbol,
                        transactionId: finalTransactionId
                    });

                    await historyEntry.save();

                    addedItems.push({
                        id: newStateItem._id,
                        fullName: item.fullName,
                        size: item.size,
                        barcode: item.barcode,
                        transfer_to: item.transfer_to
                    });

                } catch (itemError) {
                    console.error(`Error processing warehouse item:`, itemError);
                    errors.push(`Warehouse item processing error: ${itemError.message}`);
                }
            }

            // Final check - count all items for all users
            const finalStateCount = await State.countDocuments({});
            const allUsers = await User.find({});
            console.log(`🏁 FINAL STATE SUMMARY: Total items in database: ${finalStateCount}`);
            for (const user of allUsers) {
                const userCount = await State.countDocuments({ sellingPoint: user._id });
                if (userCount > 0) {
                    console.log(`  - ${user.symbol}: ${userCount} items`);
                }
            }

            res.status(200).json({
                message: 'Warehouse items processed successfully',
                transactionId: finalTransactionId,
                processedCount: addedItems.length,
                addedItems: addedItems,
                errors: errors
            });

        } catch (error) {
            console.error('Error processing warehouse items:', error);
            res.status(500).json({
                message: 'Failed to process warehouse items',
                error: error.message
            });
        }
    }

    // Get last transaction info
    // Get last transaction info (simplified - no more COFNIĘTE entries)
    async getLastTransaction(req, res) {
        try {
            console.log('Getting last transaction...'); // Debug log
            
            // Find the most recent active transaction (only active operations)
            const lastTransaction = await History.findOne({
                $or: [
                    { operation: 'Odpisano ze stanu (transfer)' },
                    { operation: 'Dodano do stanu (z magazynu)' },
                    { operation: 'Przeniesiono do korekt' },
                    { operation: 'Odpisano ze stanu (sprzedaż)' }
                ],
                transactionId: { $exists: true, $ne: null }
            }).sort({ timestamp: -1 });

            console.log('Last transaction found:', lastTransaction ? lastTransaction.transactionId : 'NONE'); // Debug log

            if (!lastTransaction) {
                console.log('No transaction found - returning 404'); // Debug log
                return res.status(404).json({
                    message: 'No recent transaction found'
                });
            }

            // Count items in this transaction
            const transactionCount = await History.countDocuments({
                transactionId: lastTransaction.transactionId
            });

            console.log('Transaction count:', transactionCount); // Debug log

            // Determine transaction type for UI
            const hasWarehouseItems = await History.findOne({
                transactionId: lastTransaction.transactionId,
                operation: 'Dodano do stanu (z magazynu)'
            });

            const hasStandardItems = await History.findOne({
                transactionId: lastTransaction.transactionId,
                operation: 'Odpisano ze stanu (transfer)'
            });

            let transactionType = 'standard';
            if (hasWarehouseItems && hasStandardItems) {
                transactionType = 'mixed';
            } else if (hasWarehouseItems) {
                transactionType = 'warehouse';
            }

            res.status(200).json({
                transactionId: lastTransaction.transactionId,
                timestamp: lastTransaction.timestamp,
                itemCount: transactionCount,
                canUndo: true,
                transactionType: transactionType
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
