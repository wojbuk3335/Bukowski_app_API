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

                        // WAŻNE: Oznacz sprzedaż jako przetworzoną (podobnie jak transfery)
                        // Sprawdź czy ID jest prawidłowym MongoDB ObjectId (nie fake z testów)
                        const mongoose = require('mongoose');
                        if (mongoose.Types.ObjectId.isValid(sale._id) && !sale._id.toString().startsWith('fake')) {
                            const Sales = require('../db/models/sales');
                            await Sales.findByIdAndUpdate(sale._id, {
                                processed: true,
                                processedAt: new Date()
                            });
                            console.log(`✅ Marked sale ${sale.barcode} as processed`);
                        } else {
                            console.log(`⚠️ Skipping sales update for invalid/test ID: ${sale._id}`);
                        }

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
            // NAJWAŻNIEJSZE: Znajdź ostatnią transakcję AddToState (ignoruj korekty)
            const lastTransaction = await History.findOne({
                $or: [
                    { operation: 'Odpisano ze stanu (transfer)' },
                    { operation: 'Dodano do stanu (z magazynu)' },
                    { operation: 'Dodano do stanu (transfer przychodzący)' }, // DODANO: obsługa żółtych produktów
                    { operation: 'Odpisano ze stanu (sprzedaż)' }
                    // USUNIĘTO: 'Przeniesiono do korekt' - nie cofamy korekt, tylko oryginalne operacje AddToState
                ],
                transactionId: { $exists: true, $ne: null }
            }).sort({ timestamp: -1 });

            if (!lastTransaction) {
                return res.status(404).json({
                    message: 'No recent transaction found to undo'
                });
            }

            // KLUCZOWA ZMIANA: Znajdź tylko wpisy AddToState dla tej transakcji (ignoruj korekty)
            const transactionEntries = await History.find({
                transactionId: lastTransaction.transactionId,
                $or: [
                    { operation: 'Odpisano ze stanu (transfer)' },
                    { operation: 'Dodano do stanu (z magazynu)' },
                    { operation: 'Dodano do stanu (transfer przychodzący)' },
                    { operation: 'Odpisano ze stanu (sprzedaż)' }
                    // IGNORUJEMY: 'Przeniesiono do korekt' - zostawiamy korekty nietknięte
                ]
            });

            if (transactionEntries.length === 0) {
                return res.status(404).json({
                    message: 'No AddToState transaction entries found to undo'
                });
            }

            const restoredItems = [];
            const errors = [];
            const User = require('../db/models/user');

            // Process each entry in the transaction (tylko AddToState operacje)
            for (const entry of transactionEntries) {
                try {
                    // Determine type of undo based on operation (bez korekt)
                    const isWarehouseEntry = entry.operation === 'Dodano do stanu (z magazynu)';
                    const isIncomingTransferEntry = entry.operation === 'Dodano do stanu (transfer przychodzący)'; // DODANO: żółte produkty
                    const isSalesEntry = entry.operation === 'Odpisano ze stanu (sprzedaż)';
                    // USUNIĘTO: isCorrectionsEntry - nie obsługujemy cofania korekt
                    
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

                        const warehouseItem = await State.create({
                            _id: new mongoose.Types.ObjectId(),
                            fullName: itemData.fullName,
                            size: itemData.size,
                            barcode: itemData.barcode,
                            sellingPoint: warehouseUser._id,
                            price: itemData.price,
                            discount_price: itemData.discount_price || 0,
                            date: new Date()
                        });

                        restoredItems.push({
                            id: itemData.originalId,
                            fullName: itemData.fullNameText,
                            size: itemData.sizeText,
                            barcode: itemData.barcode,
                            action: 'restored_to_warehouse'
                        });

                    } else if (isIncomingTransferEntry) {
                        // ŻÓŁTE PRODUKTY - INCOMING TRANSFER UNDO: Remove from user state and restore to transfer list
                        const itemData = JSON.parse(entry.details);
                        
                        console.log('🟡 Processing incoming transfer undo for:', itemData.stateId);
                        
                        // Remove the item from user state
                        await State.findByIdAndDelete(itemData.stateId);
                        
                        // Restore transfer back to unprocessed status
                        const Transfer = require('../db/models/transfer');
                        await Transfer.findByIdAndUpdate(itemData.transferId || itemData.originalTransferId, {
                            processed: false,
                            processedAt: null
                        });
                        
                        restoredItems.push({
                            id: itemData.stateId,
                            fullName: entry.product,
                            barcode: itemData.barcode || 'Generated',
                            action: 'restored_to_transfer_list'
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

                        const restoredSaleItem = await State.create({
                            _id: new mongoose.Types.ObjectId(itemData.originalId),
                            fullName: itemData.fullName,
                            size: itemData.size,
                            barcode: itemData.barcode,
                            sellingPoint: itemData.sellingPoint,
                            price: itemData.price,
                            discount_price: itemData.discount_price || 0,
                            date: new Date()
                        });
                        console.log(`✅ Restored sold item ${itemData.barcode} back to state ${originalUser.symbol}`);

                        // WAŻNE: Oznacz sprzedaż jako nieprzetworzoną (przywróć processed: false)
                        const Sales = require('../db/models/sales');
                        await Sales.findByIdAndUpdate(itemData.saleId, {
                            processed: false,
                            processedAt: null
                        });
                        console.log(`✅ Marked sale ${itemData.barcode} as unprocessed`);

                        restoredItems.push({
                            id: itemData.originalId,
                            fullName: itemData.fullNameText,
                            size: itemData.sizeText,
                            barcode: itemData.barcode,
                            action: 'restored_from_sale',
                            originalSymbol: originalUser.symbol
                        });

                    } else {
                        // STANDARD TRANSFER UNDO: Restore to state and mark transfer as unprocessed
                        // Parser JSON details for standard operations
                        const itemData = JSON.parse(entry.details);
                        
                        // STANDARD UNDO: Restore to state and mark transfer as unprocessed
                        console.log('Processing standard undo for:', itemData.barcode);
                        
                        // Create new State document with original ID
                        const restoredItem = await State.create({
                            _id: new mongoose.Types.ObjectId(itemData.originalId),
                            fullName: itemData.fullName,
                            size: itemData.size,
                            barcode: itemData.barcode,
                            sellingPoint: itemData.sellingPoint,
                            price: itemData.price,
                            discount_price: itemData.discount_price,
                            date: itemData.date
                        });

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

            // DODANE: Usuń LastTransaction entry
            const LastTransaction = require('../db/models/lastTransaction');
            await LastTransaction.deleteOne({
                transactionId: lastTransaction.transactionId
            });

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
            const { warehouseItems, transactionId, isIncomingTransfer } = req.body;
            
            console.log('🟡 DEBUG: Received processWarehouseItems request');
            console.log('🟡 DEBUG: isIncomingTransfer:', isIncomingTransfer);
            console.log('🟡 DEBUG: warehouseItems count:', warehouseItems ? warehouseItems.length : 0);
            
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

                    // RÓŻNE LOGIKI DLA RÓŻNYCH TYPÓW TRANSFERÓW
                    if (isIncomingTransfer) {
                        // 🟡 ŻÓŁTE PRODUKTY - Transfer przychodzący (nie usuwamy z magazynu, tylko dodajemy do stanu)
                        console.log(`🟡 INCOMING TRANSFER: Adding ${item.fullName} to ${user.symbol} state`);
                        
                        // Wygeneruj barcode dla transferu przychodzącego (transfery nie mają barcode)
                        const generatedBarcode = item.barcode || `INCOMING_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                        console.log(`🟡 Generated barcode for incoming transfer: ${generatedBarcode}`);
                        
                        // Create new State document for user
                        const newStateId = new mongoose.Types.ObjectId();
                        console.log(`➕ CREATING new state item: ${newStateId} for ${user.symbol} (incoming)`);
                        
                        const newStateItem = await State.create({
                            _id: newStateId,
                            fullName: goods._id,
                            size: size._id,
                            barcode: generatedBarcode,
                            sellingPoint: user._id,
                            price: item.price || 0,
                            discount_price: item.discount_price || 0,
                            date: new Date()
                        });
                        console.log(`✅ SAVED incoming transfer item: ${newStateId}`);
                        
                        // OZNACZ TRANSFER JAKO PRZETWORZONY
                        const Transfer = require('../db/models/transfer');
                        await Transfer.findByIdAndUpdate(item._id, {
                            processed: true,
                            processedAt: new Date()
                        });
                        console.log(`✅ MARKED incoming transfer as processed: ${item._id}`);
                        
                        // Create history entry for incoming transfer
                        const historyEntry = new History({
                            collectionName: 'Stan',
                            operation: 'Dodano do stanu (transfer przychodzący)',
                            product: `${item.fullName} ${item.size}`,
                            details: JSON.stringify({
                                stateId: newStateItem._id,
                                transferId: item._id, // DODANO: ID transferu dla cofania
                                fromTransfer: true,
                                isIncomingTransfer: true,
                                targetUser: user.symbol,
                                barcode: generatedBarcode
                            }),
                            timestamp: new Date(),
                            transactionId: finalTransactionId
                        });

                        await historyEntry.save();
                        
                        // Dodaj do listy przetworzonych z flagą incoming transfer
                        addedItems.push({
                            ...newStateItem.toObject(),
                            isIncomingTransfer: true
                        });
                        
                    } else {
                        // 🟠 POMARAŃCZOWE PRODUKTY - Normalne przeniesienie z magazynu (usuwamy z magazynu i dodajemy do stanu)
                        console.log(`🟠 WAREHOUSE TRANSFER: Moving ${item.fullName} from warehouse to ${user.symbol}`);

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
                    
                    const newStateItem = await State.create({
                        _id: newStateId,
                        fullName: goods._id,
                        size: size._id,
                        barcode: item.barcode,
                        sellingPoint: user._id,
                        price: item.price || 0,
                        discount_price: item.discount_price || 0,
                        date: new Date()
                    });
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
                    
                    } // Koniec bloku else dla POMARAŃCZOWYCH PRODUKTÓW

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

            // Aktualizuj ostatnią transakcję dla cofania
            if (addedItems.length > 0) {
                const LastTransaction = require('../db/models/lastTransaction');
                
                // Określ typ transakcji
                const transactionType = addedItems.some(item => item.isIncomingTransfer) ? 'incoming_transfer' : 'warehouse';
                
                await LastTransaction.findOneAndUpdate(
                    {}, 
                    {
                        transactionId: finalTransactionId,
                        timestamp: new Date(),
                        itemCount: addedItems.length,
                        transactionType: transactionType,
                        canUndo: true
                    },
                    { upsert: true }
                );
                console.log(`💾 Updated last transaction: ${finalTransactionId} (${transactionType})`);
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
            
            // NAJWAŻNIEJSZE: Znajdź ostatnią transakcję z AddToState, ignoruj korekty w wyszukiwaniu
            // Szukamy tylko pierwotnych operacji AddToState, nie późniejszych korekt
            const lastTransaction = await History.findOne({
                $or: [
                    { operation: 'Odpisano ze stanu (transfer)' },
                    { operation: 'Dodano do stanu (z magazynu)' },
                    { operation: 'Dodano do stanu (transfer przychodzący)' }, // DODANO: żółte produkty
                    { operation: 'Odpisano ze stanu (sprzedaż)' }
                    // USUNIĘTO: 'Przeniesiono do korekt' - ignorujemy korekty w wyszukiwaniu ostatniej transakcji
                ],
                transactionId: { $exists: true, $ne: null }
            }).sort({ timestamp: -1 });

            console.log('Last transaction found:', lastTransaction ? lastTransaction.transactionId : 'NONE'); // Debug log

            if (!lastTransaction) {
                console.log('No transaction found - returning empty response'); // Debug log
                return res.status(200).json({
                    message: 'No recent transaction found',
                    canUndo: false,
                    lastTransaction: null
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

            const hasIncomingTransfers = await History.findOne({
                transactionId: lastTransaction.transactionId,
                operation: 'Dodano do stanu (transfer przychodzący)'
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
            } else if (hasIncomingTransfers) {
                transactionType = 'incoming'; // DODANO: typ dla żółtych produktów
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
