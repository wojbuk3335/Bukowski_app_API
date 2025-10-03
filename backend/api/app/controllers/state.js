const State = require('../db/models/state'); // Adjusted to use the correct model
const mongoose = require('mongoose');
const config = require('../config');
const Goods = require('../db/models/goods'); // Import Goods model
const Size = require('../db/models/size');   // Import Size model

// Corrected checksum calculation function
const calculateChecksum = (barcode) => {
    const digits = barcode.split('').map(Number);
    const sum = digits.reduce((acc, digit, index) => {
        return acc + (index % 2 === 0 ? digit : digit * 3); // Correct weights: 1 for odd, 3 for even
    }, 0);
    const checksum = (10 - (sum % 10)) % 10; // Ensure checksum is between 0-9
    return checksum;
};

class StatesController {
    // Get warehouse items (products with MAGAZYN/magazyn symbol)
    async getWarehouseItems(req, res, next) {
        try {
            console.log('Fetching warehouse items...'); // Debug log
            
            const warehouseStates = await State.find()
                .populate('fullName', 'fullName price priceExceptions discount_price')
                .populate('size', 'Roz_Opis')
                .populate('sellingPoint', 'symbol');

            // Filter for warehouse items (symbol contains 'MAGAZYN' or 'magazyn')
            const warehouseItems = warehouseStates.filter(state => {
                const symbol = state.sellingPoint ? state.sellingPoint.symbol : '';
                return symbol.toLowerCase().includes('magazyn');
            });

            console.log(`Found ${warehouseItems.length} warehouse items`); // Debug log

            const sanitizedWarehouseItems = warehouseItems.map(state => ({
                _id: state._id,
                fullName: state.fullName,
                date: state.date,
                plec: state.plec,
                size: state.size || { Roz_Opis: '-' }, // Dla torebek gdy size jest null, pokaż "-"
                barcode: state.barcode,
                sellingPoint: state.sellingPoint,
                price: state.fullName ? state.fullName.price : 0,
                discount_price: state.fullName ? state.fullName.discount_price : 0
            }));

            res.status(200).json(sanitizedWarehouseItems);
        } catch (error) {
            console.error('Error fetching warehouse items:', error);
            res.status(500).json({ message: 'Failed to fetch warehouse items', error: error.message });
        }
    }

    // Get all states
    async getAllStates(req, res, next) {
        try {
            const states = await State.find()
                .populate('fullName', 'fullName price priceExceptions discount_price category') // Include category
                .populate('size', 'Roz_Opis')
                .populate('sellingPoint', 'symbol');

            const sanitizedStates = states.map(state => ({
                id: state._id,
                fullName: state.fullName ? state.fullName.fullName : 'Nieznany produkt', // Handle null fullName
                date: state.date,
                plec: state.plec,
                size: (state.fullName && state.fullName.category === 'Torebki') 
                    ? '-' 
                    : (state.size ? state.size.Roz_Opis : 'Nieznany rozmiar'), // Handle bags and null size
                barcode: state.barcode,
                symbol: state.sellingPoint ? state.sellingPoint.symbol : 'Nieznany punkt sprzedaży', // Handle null sellingPoint
                price: state.fullName ? state.fullName.price : 0, // Handle null price
                discount_price: state.fullName ? state.fullName.discount_price : 0, // Include discount_price
                category: state.fullName ? state.fullName.category : null // Include category for frontend
            }));

            res.status(200).json(sanitizedStates);
        } catch (error) {
            console.error('Error fetching states:', error); // Log the error for debugging
            res.status(500).json({ message: 'Failed to fetch states', error: error.message });
        }
    }

    // Create a new state
    async createState(req, res, next) {
        try {
            // Find the ObjectId for fullName in Goods
            const goods = await Goods.findOne({ fullName: req.body.fullName }).populate('priceExceptions.size');
            if (!goods) {
                return res.status(404).send('Goods not found');
            }

            const plec = goods.Plec; // Assuming `Plec` is the field in Goods
            if (!plec) {
                return res.status(404).send('Plec not found');
            }

            // Special handling for bags category or "-" size
            let size, barcode;
            
            if (goods.category === 'Torebki' || req.body.size === '-') {
                // For bags, don't create any size - use null and handle specially
                size = null;
                
                // For bags, use original barcode without modification
                barcode = goods.code;
            } else {
                // Find the ObjectId for size in Size (only for non-bag products)
                size = await Size.findOne({ Roz_Opis: req.body.size });
                if (!size) {
                    return res.status(404).send('Size not found');
                }
                
                // Extract the code from Goods and update it with Roz_Kod
                barcode = goods.code; // Assuming `code` is the field in Goods
                const rozKod = size.Roz_Kod; // Assuming `Roz_Kod` is the field in Size
                barcode = barcode.substring(0, 5) + rozKod + barcode.substring(7, 11);

                // Corrected checksum calculation
                const checksum = calculateChecksum(barcode);
                barcode = barcode.substring(0, 12) + checksum; // Append checksum to barcode
            }

            // Find the ObjectId for sellingPoint in User
            const user = await mongoose.models.User.findOne({ symbol: req.body.sellingPoint });
            if (!user) {
                return res.status(404).send('Selling point not found');
            }

            // Handle price from frontend - support both single price and semicolon-separated prices
            let finalPrice, finalDiscountPrice;
            
            if (req.body.price && typeof req.body.price === 'string' && req.body.price.includes(';')) {
                // Price comes from frontend in format "price;discount_price"
                const prices = req.body.price.split(';');
                finalPrice = Number(prices[0]) || 0;
                finalDiscountPrice = Number(prices[1]) || 0;
            } else {
                // Calculate the price normally from goods data
                const basePrice = goods.price || 0;
                const discountPrice = goods.discount_price || 0;
                
                // For bags, don't check price exceptions as they use special TOREBKA size
                let exception = null;
                if (goods.category !== 'Torebki' && size && size.Roz_Opis !== 'TOREBKA') {
                    exception = goods.priceExceptions.find(
                        (ex) => ex.size && ex.size._id.toString() === size._id.toString()
                    );
                }
                
                finalPrice = exception ? exception.value : basePrice;
                finalDiscountPrice = !exception && discountPrice && Number(discountPrice) !== 0 ? discountPrice : undefined;
            }

            // Save both price and discount_price
            const stateData = {
                _id: new mongoose.Types.ObjectId(),
                fullName: goods._id,
                date: req.body.date,
                plec: goods.Plec,
                barcode,
                sellingPoint: user._id,
                price: finalPrice,
                discount_price: finalDiscountPrice
            };

            // For bags, don't set size field; for other products, set size
            if (goods.category !== 'Torebki' && req.body.size !== '-') {
                stateData.size = size._id;
            }

            const state = new State(stateData);
            const newState = await state.save();
            res.status(201).json(newState);
        } catch (error) {
            console.error('Error creating state:', error); // Log the error
            res.status(500).json({ message: 'Failed to create state', error: error.message });
        }
    }

    // Get a state by ID
    async getStateById(req, res, next) {
        try {
            const state = await State.findById(req.params.id);
            if (!state) {
                return res.status(404).json({ message: 'State not found' });
            }
            res.status(200).json(state);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Update a state by ID
    async updateStateById(req, res, next) {
        try {
            const { id } = req.params;
            const { fullName, date, size, sellingPoint } = req.body;

            // Find Goods by fullName
            const goods = fullName ? await Goods.findOne({ fullName }) : null;
            if (fullName && !goods) {
                return res.status(404).send('Goods not found');
            }

            // Find Size by Roz_Opis
            const sizeObj = size ? await Size.findOne({ Roz_Opis: size }) : null;
            if (size && !sizeObj) {
                return res.status(404).send('Size not found');
            }

            // Find User by symbol
            const user = sellingPoint ? await mongoose.models.User.findOne({ symbol: sellingPoint }) : null;
            if (sellingPoint && !user) {
                return res.status(404).send('Selling point not found');
            }

            // Update barcode if fullName and size are provided
            let barcode = goods && sizeObj ? goods.code.substring(0, 5) + sizeObj.Roz_Kod + goods.code.substring(7, 11) : undefined;
            if (barcode) {
                const checksum = calculateChecksum(barcode);
                barcode = barcode.substring(0, 12) + checksum;
            }

            // Update state
            const updatedState = await State.findByIdAndUpdate(
                id,
                {
                    fullName: goods ? goods._id : undefined,
                    date: date || undefined,
                    size: sizeObj ? sizeObj._id : undefined,
                    barcode: barcode || undefined,
                    sellingPoint: user ? user._id : undefined, // Update sellingPoint
                },
                { new: true } // Return the updated document
            );

            if (!updatedState) {
                return res.status(404).json({ message: 'State not found' });
            }

            res.status(200).json(updatedState);
        } catch (error) {
            console.error('Error updating state:', error); // Log the error for debugging
            res.status(400).json({ error: error.message });
        }
    }

    // Delete a state by ID
    async deleteState(req, res, next) {
        try {
            const { id } = req.params;

            // Check if the ID is valid
            if (!id || !mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ message: 'Invalid state ID' });
            }

            // Get the state first to gather information for history
            const stateToDelete = await State.findById(id)
                .populate('fullName', 'fullName')
                .populate('size', 'Roz_Opis')
                .populate('sellingPoint', 'symbol');

            if (!stateToDelete) {
                return res.status(404).json({ message: 'State not found' });
            }

            // Get operation details from headers
            const operationType = req.headers['operation-type'] || 'delete';
            let targetSymbol = req.headers['target-symbol'] || '-';
            const userloggedinId = req.user ? req.user._id : null;

            // Helper function to get symbol by sellingPoint
            const getSymbolBySellingPoint = async (sellingPoint) => {
                try {
                    if (!sellingPoint || sellingPoint === '-' || sellingPoint === 'Manual') {
                        return sellingPoint;
                    }
                    
                    const User = require('../db/models/user');
                    const user = await User.findOne({ sellingPoint: sellingPoint }).lean();
                    
                    if (user && user.symbol) {
                        return user.symbol;
                    } else {
                        return sellingPoint;
                    }
                } catch (error) {
                    console.error(`Error finding user by sellingPoint "${sellingPoint}":`, error);
                    return sellingPoint;
                }
            };

            // Use helper function to map sellingPoint to symbol
            targetSymbol = await getSymbolBySellingPoint(targetSymbol);

            // Create manual history entries
            const History = require('../db/models/history');
            const product = `${stateToDelete.fullName?.fullName || 'Nieznany produkt'} ${stateToDelete.size?.Roz_Opis || 'Nieznany rozmiar'}`;
            const currentSymbol = stateToDelete.sellingPoint?.symbol || 'MAGAZYN';

            // For green items (transfer-same), create TWO history entries
            if (operationType === 'transfer-same') {
                // First entry: Transfer from MAGAZYN to selling point
                const transferHistoryEntry = new History({
                    collectionName: 'Stan',
                    operation: 'Przesunięto ze stanu',
                    product: product,
                    details: `Przesunięto produkt ze stanu ${product} z MAGAZYN do ${targetSymbol}`,
                    userloggedinId: userloggedinId,
                    from: 'MAGAZYN',
                    to: targetSymbol
                });

                // Second entry: Sale from selling point
                const saleHistoryEntry = new History({
                    collectionName: 'Stan',
                    operation: 'Sprzedano ze stanu',
                    product: product,
                    details: `Sprzedano produkt ze stanu ${product}`,
                    userloggedinId: userloggedinId,
                    from: targetSymbol,
                    to: 'Sprzedano'
                });

                // Save both history entries
                await Promise.all([
                    transferHistoryEntry.save(),
                    saleHistoryEntry.save()
                ]);

                console.log(`Created 2 history entries for green item (transfer-same): ${product}`);

            } else if (operationType === 'transfer-from-magazyn') {
                // For orange items, create one transfer entry
                const historyEntry = new History({
                    collectionName: 'Stan',
                    operation: 'Przesunięto ze stanu',
                    product: product,
                    details: `Przesunięto produkt ze stanu ${product}`,
                    userloggedinId: userloggedinId,
                    from: currentSymbol,
                    to: targetSymbol
                });

                await historyEntry.save();
                console.log(`Created 1 history entry for orange item (transfer-from-magazyn): ${product}`);
            }

            // Delete the state
            const deletedState = await State.findByIdAndDelete(id);
            
            res.status(200).json({ 
                message: 'State deleted successfully',
                operationType: operationType,
                historyEntriesCreated: operationType === 'transfer-same' ? 2 : 1
            });
        } catch (error) {
            console.error('Error deleting state:', error);
            res.status(500).json({ message: 'Failed to delete state', error: error.message });
        }
    }

    // Find states by barcode
    async getStatesByBarcode(req, res, next) {
        try {
            const { barcode } = req.params;

            // Check if barcode is provided
            if (!barcode) {
                return res.status(400).json({ message: 'Barcode is required' });
            }

            // Find all states with matching barcode
            const states = await State.find({ barcode: barcode })
                .populate('fullName', 'fullName')
                .populate('size', 'Roz_Opis')
                .populate('sellingPoint', 'symbol');

            if (states.length === 0) {
                return res.status(404).json({ message: 'No states with this barcode found', barcode: barcode });
            }

            // Transform the results to include the populated fields
            const transformedStates = states.map(state => ({
                _id: state._id,
                barcode: state.barcode,
                symbol: state.sellingPoint?.symbol || 'UNKNOWN',
                fullName: state.fullName?.fullName || 'UNKNOWN',
                size: state.size?.Roz_Opis || 'UNKNOWN',
                price: state.price,
                discount_price: state.discount_price
            }));

            res.status(200).json(transformedStates);
        } catch (error) {
            console.error('Error finding states by barcode:', error);
            res.status(500).json({ message: 'Failed to find states by barcode', error: error.message });
        }
    }

    // Delete all states by barcode (keep for compatibility)
    async deleteStateByBarcode(req, res, next) {
        try {
            const { barcode } = req.params;

            // Check if barcode is provided
            if (!barcode) {
                return res.status(400).json({ message: 'Barcode is required' });
            }

            // Find all states with matching barcode first
            const statesToDelete = await State.find({ barcode: barcode })
                .populate('fullName', 'fullName')
                .populate('size', 'Roz_Opis')
                .populate('sellingPoint', 'symbol');

            if (statesToDelete.length === 0) {
                return res.status(404).json({ message: 'No states with this barcode found' });
            }

            // Delete all states with this barcode using deleteMany
            const deleteResult = await State.deleteMany({ barcode: barcode });

            res.status(200).json({ 
                message: `Successfully deleted ${deleteResult.deletedCount} states with barcode ${barcode}`,
                deletedCount: deleteResult.deletedCount,
                foundCount: statesToDelete.length
            });
        } catch (error) {
            console.error('Error deleting states by barcode:', error);
            res.status(500).json({ message: 'Failed to delete states by barcode', error: error.message });
        }
    }

    // Delete states by barcode and symbol (selling point) with count limit
    async deleteStateByBarcodeAndSymbol(req, res, next) {
        try {
            const { barcode, symbol } = req.params;
            const { count } = req.query; // Optional count parameter

            // Check if barcode and symbol are provided
            if (!barcode || !symbol) {
                return res.status(400).json({ message: 'Barcode and symbol are required' });
            }

            const deleteCount = count ? parseInt(count) : null; // Parse count or null for all

            // Find all states with matching barcode AND symbol
            const statesToDelete = await State.find({ 
                barcode: barcode,
                // We need to populate sellingPoint to access the symbol
            })
            .populate('fullName', 'fullName')
            .populate('size', 'Roz_Opis')
            .populate('sellingPoint', 'symbol');

            // Filter by symbol after population
            const filteredStatesToDelete = statesToDelete.filter(state => 
                state.sellingPoint && state.sellingPoint.symbol === symbol
            );

            if (filteredStatesToDelete.length === 0) {
                return res.status(404).json({ 
                    message: 'No states with this barcode and symbol found',
                    barcode: barcode,
                    symbol: symbol,
                    availableStates: statesToDelete.map(s => ({
                        symbol: s.sellingPoint?.symbol,
                        fullName: s.fullName?.fullName
                    }))
                });
            }

            // Limit the states to delete if count is specified
            const statesToActuallyDelete = deleteCount ? 
                filteredStatesToDelete.slice(0, deleteCount) : 
                filteredStatesToDelete;

            // Get IDs of states to delete
            const idsToDelete = statesToActuallyDelete.map(state => state._id);

            // Delete specific states by their IDs
            const deleteResult = await State.deleteMany({ _id: { $in: idsToDelete } });

            // Manual history logging for each deleted state
            const History = require('../db/models/history');
            const User = require('../db/models/user');
            const userloggedinId = req.user ? req.user._id : null;
            const operationType = req.headers['operation-type'] || 'delete';
            let targetSymbol = req.headers['target-symbol'] || '-';

            // Helper function to get symbol by sellingPoint
            const getSymbolBySellingPoint = async (sellingPoint) => {
                try {
                    console.log(`[DEBUG Controller Helper] Looking for symbol for sellingPoint: "${sellingPoint}"`);
                    if (!sellingPoint || sellingPoint === '-' || sellingPoint === 'Manual') {
                        console.log(`[DEBUG Controller Helper] sellingPoint is empty, -, or Manual - returning as is`);
                        return sellingPoint;
                    }
                    
                    const user = await User.findOne({ sellingPoint: sellingPoint }).lean();
                    console.log(`[DEBUG Controller Helper] Found user:`, user);
                    
                    if (user && user.symbol) {
                        console.log(`[DEBUG Controller Helper] Mapped "${sellingPoint}" to symbol "${user.symbol}"`);
                        return user.symbol;
                    } else {
                        console.log(`[DEBUG Controller Helper] No user found for sellingPoint "${sellingPoint}", returning original value`);
                        return sellingPoint;
                    }
                } catch (error) {
                    console.error(`[DEBUG Controller Helper] Error finding user by sellingPoint "${sellingPoint}":`, error);
                    return sellingPoint; // Return original value on error
                }
            };

            // Use helper function to map sellingPoint to symbol
            targetSymbol = await getSymbolBySellingPoint(targetSymbol);
            console.log(`[DEBUG Controller] Final targetSymbol after mapping: ${targetSymbol}`);

            // Create history entries for each deleted state (SKIP if this is correction write-off with existing correction)
            const correctionId = req.headers['correction-id'];
            const correctionTransactionId = req.headers['correction-transaction-id'];
            const shouldSkipNewHistoryEntry = (operationType === 'write-off' && correctionTransactionId && correctionId);
            
            let historyPromises = [];
            
            if (!shouldSkipNewHistoryEntry) {
                historyPromises = statesToActuallyDelete.map(async (state) => {
                    const product = `${state.fullName?.fullName || 'Nieznany produkt'} ${state.size?.Roz_Opis || 'Nieznany rozmiar'}`;
                    const from = state.sellingPoint?.symbol || 'MAGAZYN';
                    
                    let operation, details;
                    if (operationType === 'correction-undo-single' || operationType === 'correction-undo-transaction') {
                        // This is a correction/undo operation - product is being moved back to warehouse
                        operation = 'Przesunięto do magazynu (korekta)';
                        details = `Przesunięto produkt ${product} z ${from} do ${targetSymbol} (korekta transakcji)`;
                    } else if (operationType === 'delete') {
                        operation = 'Sprzedano ze stanu';
                        details = `Sprzedano produkt ze stanu ${product}`;
                    } else {
                        operation = 'Przesunięto ze stanu';
                        details = `Przesunięto produkt ze stanu ${product}`;
                    }

                    const historyEntry = new History({
                        collectionName: 'Stan',
                        operation: operation,
                        product: product,
                        details: details,
                        userloggedinId: userloggedinId,
                        from: from,
                        to: targetSymbol
                    });

                    return historyEntry.save();
                });

                // Wait for all history entries to be saved
                await Promise.all(historyPromises);
                console.log(`Created ${historyPromises.length} history entries`);
            } else {
                console.log(`Skipped creating new history entries - will update existing correction entry instead`);
            }

            // NOWE: Jeśli to jest operacja z korekt, zaktualizuj wpis korekty w historii
            if (operationType === 'write-off') {
                const correctionId = req.headers['correction-id'];
                const correctionTransactionId = req.headers['correction-transaction-id'];
                
                if (correctionTransactionId && correctionId) {
                    // Wywołaj funkcję do aktualizacji
                    try {
                        console.log(`🔄 Updating correction history entry: transactionId=${correctionTransactionId}, correctionId=${correctionId}, newFromSymbol=${symbol}`);
                        
                        // Sprawdźmy najpierw wszystkie wpisy z tym transactionId
                        const allEntriesWithTransactionId = await History.find({
                            transactionId: correctionTransactionId
                        });
                        console.log(`📊 Found ${allEntriesWithTransactionId.length} entries with transactionId ${correctionTransactionId}:`);
                        allEntriesWithTransactionId.forEach((entry, index) => {
                            console.log(`  [${index}] collectionName: "${entry.collectionName}", operation: "${entry.operation}", from: "${entry.from}", to: "${entry.to}"`);
                        });
                        
                        // Szukaj wpisu korekty - sprawdź różne możliwości
                        let correctionEntry = await History.findOne({
                            transactionId: correctionTransactionId,
                            collectionName: 'Korekty',
                            operation: 'Przeniesiono do korekt'
                        });
                        
                        // Jeśli nie znaleźliśmy, spróbuj bez operation (może była inna)
                        if (!correctionEntry) {
                            console.log('❌ Not found with exact match, trying with collectionName only...');
                            correctionEntry = await History.findOne({
                                transactionId: correctionTransactionId,
                                collectionName: 'Korekty'
                            });
                        }
                        
                        // Jeśli nadal nie ma, spróbuj znaleźć jakikolwiek wpis z tym transactionId
                        if (!correctionEntry && allEntriesWithTransactionId.length > 0) {
                            console.log('❌ Still not found, using first entry with matching transactionId...');
                            correctionEntry = allEntriesWithTransactionId[0];
                        }
                        
                        if (correctionEntry) {
                            console.log('📋 Found correction entry:', {
                                id: correctionEntry._id,
                                collectionName: correctionEntry.collectionName,
                                operation: correctionEntry.operation,
                                from: correctionEntry.from,
                                to: correctionEntry.to
                            });
                            
                            // Sprawdź czy to był transfer czy sprzedaż na podstawie pola "to"
                            const isFromSale = correctionEntry.to === 'SPRZEDANO';
                            
                            // Aktualizuj wpis zgodnie z nową logiką
                            const updateData = {
                                collectionName: 'Stan', // Zmiana z 'Korekty' na 'Stan'
                                operation: isFromSale ? 'Odpisano ze stanu (sprzedaż)' : 'Odpisano ze stanu (transfer)', // Zmiana operacji
                                from: symbol, // Nowy punkt źródłowy (wybrany w korektach)
                                // 'to' pozostaje bez zmiany (M lub SPRZEDANO)
                            };
                            
                            await History.findByIdAndUpdate(correctionEntry._id, updateData);
                            console.log(`✅ Updated correction history entry: ${correctionEntry._id}`);
                            console.log(`   - collectionName: ${correctionEntry.collectionName} → Stan`);
                            console.log(`   - operation: ${correctionEntry.operation} → ${updateData.operation}`);
                            console.log(`   - from: ${correctionEntry.from} → ${symbol}`);
                            console.log(`   - to: ${correctionEntry.to} (unchanged)`);
                        } else {
                            console.log('❌ Correction history entry not found - no entries with matching transactionId');
                        }
                        
                    } catch (error) {
                        console.error('❌ Error updating correction history entry:', error);
                    }
                }
            }

            res.status(200).json({ 
                message: `Successfully deleted ${deleteResult.deletedCount} states with barcode ${barcode} and symbol ${symbol}`,
                deletedCount: deleteResult.deletedCount,
                foundCount: filteredStatesToDelete.length,
                requestedCount: deleteCount,
                deletedStates: statesToActuallyDelete.map(state => ({
                    id: state._id,
                    fullName: state.fullName?.fullName,
                    size: state.size?.Roz_Opis,
                    barcode: state.barcode,
                    symbol: state.sellingPoint?.symbol
                }))
            });
        } catch (error) {
            console.error('Error deleting states by barcode and symbol:', error);
            res.status(500).json({ message: 'Failed to delete states by barcode and symbol', error: error.message });
        }
    }

    // Get states formatted for a frontend table
    async getStatesForTable(req, res, next) {
        try {
            const states = await State.find()
                .populate('fullName', 'fullName') // Populate fullName with its value from Goods
                .populate('size', 'Roz_Opis')
                .populate('sellingPoint', 'symbol'); // Populate symbol instead of sellingPoint

            // Format the data for the table
            const tableData = states.map(state => ({
                id: state._id,
                fullName: state.fullName ? state.fullName.fullName : 'Nieznany produkt', // Handle null fullName
                date: state.date,
                size: state.size ? state.size.Roz_Opis : 'Nieznany rozmiar',         // Handle null size
                symbol: state.sellingPoint ? state.sellingPoint.symbol : 'Nieznany punkt sprzedaży' // Handle null sellingPoint
            }));

            res.status(200).json(tableData);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Restore items (for transaction undo functionality)
    async restoreState(req, res, next) {
        try {
            const { 
                fullName, 
                size, 
                barcode, 
                symbol, 
                price, 
                discount_price,
                operationType 
            } = req.body;

            // Validate required fields
            if (!fullName || !size || !barcode || !symbol) {
                return res.status(400).json({ 
                    message: 'Missing required fields: fullName, size, barcode, symbol' 
                });
            }

            // Find the ObjectId for fullName in Goods
            const goods = await Goods.findOne({ fullName: fullName });
            if (!goods) {
                return res.status(404).json({ message: `Goods not found for: ${fullName}` });
            }

            // Find the ObjectId for size in Size
            const sizeObj = await Size.findOne({ Roz_Opis: size });
            if (!sizeObj) {
                return res.status(404).json({ message: `Size not found for: ${size}` });
            }

            // Find the ObjectId for sellingPoint in User by symbol
            const User = require('../db/models/user');
            const user = await User.findOne({ symbol: symbol });
            if (!user) {
                return res.status(404).json({ message: `User not found for symbol: ${symbol}` });
            }

            // Handle price format - split if contains semicolon to avoid validation errors
            let finalPrice, finalDiscountPrice;
            
            if (price && typeof price === 'string' && price.includes(';')) {
                // Price comes in format "price;discount_price"
                const prices = price.split(';');
                finalPrice = Number(prices[0]) || goods.price || 0;
                finalDiscountPrice = Number(prices[1]) || goods.discount_price || 0;
                console.log(`Parsed semicolon price format in restoreState: "${price}" → price: ${finalPrice}, discount: ${finalDiscountPrice}`);
            } else {
                // Single price value
                finalPrice = Number(price) || goods.price || 0;
                finalDiscountPrice = Number(discount_price) || goods.discount_price || 0;
            }

            // Create new state entry
            const state = new State({
                _id: new mongoose.Types.ObjectId(),
                fullName: goods._id,
                date: new Date(),
                plec: goods.Plec,
                size: sizeObj._id,
                barcode: barcode,
                sellingPoint: user._id,
                price: finalPrice,
                discount_price: finalDiscountPrice
            });

            const newState = await state.save();

            // Create history entry for restoration
            const History = require('../db/models/history');
            const userloggedinId = req.user ? req.user._id : null;
            const product = `${fullName} ${size}`;
            
            const historyEntry = new History({
                collectionName: 'Stan',
                operation: 'Przywrócono do stanu',
                product: product,
                details: `Przywrócono produkt do stanu ${product} (anulowanie transakcji)`,
                userloggedinId: userloggedinId,
                from: 'SYSTEM_RESTORE',
                to: symbol
            });

            await historyEntry.save();

            res.status(201).json({ 
                message: 'State restored successfully',
                newState: newState,
                operationType: operationType || 'restore'
            });

        } catch (error) {
            console.error('Error restoring state:', error);
            res.status(500).json({ 
                message: 'Failed to restore state', 
                error: error.message 
            });
        }
    }

    // Restore items silently (for transaction undo functionality without history logging)
    async restoreStateSilent(req, res, next) {
        try {
            const { 
                fullName, 
                size, 
                barcode, 
                symbol, 
                price, 
                discount_price,
                operationType 
            } = req.body;

            console.log('🔵 [SILENT RESTORE] Request data:', { fullName, size, barcode, symbol, price, discount_price, operationType });

            // Validate required fields
            if (!fullName || !size || !barcode || !symbol) {
                return res.status(400).json({ 
                    message: 'Missing required fields: fullName, size, barcode, symbol' 
                });
            }

            // Find the ObjectId for fullName in Goods
            const goods = await Goods.findOne({ fullName: fullName });
            if (!goods) {
                return res.status(404).json({ message: `Goods not found for: ${fullName}` });
            }

            // Find the ObjectId for size in Size
            const sizeObj = await Size.findOne({ Roz_Opis: size });
            if (!sizeObj) {
                return res.status(404).json({ message: `Size not found for: ${size}` });
            }

            // Find the ObjectId for sellingPoint in User by symbol
            const User = require('../db/models/user');
            console.log('🔍 [SILENT RESTORE] Looking for user with symbol:', symbol);
            const user = await User.findOne({ symbol: symbol });
            console.log('👤 [SILENT RESTORE] Found user:', user ? { symbol: user.symbol, sellingPoint: user.sellingPoint, _id: user._id } : 'NOT FOUND');
            if (!user) {
                console.error('❌ [SILENT RESTORE] User not found for symbol:', symbol);
                return res.status(404).json({ message: `User not found for symbol: ${symbol}` });
            }

            // Handle price format - split if contains semicolon to avoid validation errors
            let finalPrice, finalDiscountPrice;
            
            if (price && typeof price === 'string' && price.includes(';')) {
                // Price comes in format "price;discount_price"
                const prices = price.split(';');
                finalPrice = Number(prices[0]) || goods.price || 0;
                finalDiscountPrice = Number(prices[1]) || goods.discount_price || 0;
                console.log(`Parsed semicolon price format: "${price}" → price: ${finalPrice}, discount: ${finalDiscountPrice}`);
            } else {
                // Single price value
                finalPrice = Number(price) || goods.price || 0;
                finalDiscountPrice = Number(discount_price) || goods.discount_price || 0;
            }

            // Create new state entry
            const state = new State({
                _id: new mongoose.Types.ObjectId(),
                fullName: goods._id,
                date: new Date(),
                plec: goods.Plec,
                size: sizeObj._id,
                barcode: barcode,
                sellingPoint: user._id,
                price: finalPrice,
                discount_price: finalDiscountPrice
            });

            const newState = await state.save();
            console.log('✅ [SILENT RESTORE] State saved successfully:', {
                id: newState._id,
                barcode: newState.barcode,
                symbol: symbol,
                fullName: fullName,
                size: size
            });

            // NO HISTORY LOGGING - Silent restore for transaction cancellation

            res.status(201).json({ 
                message: 'State restored silently without history logging',
                newState: newState,
                operationType: operationType || 'restore-silent'
            });

        } catch (error) {
            console.error('Error restoring state silently:', error);
            res.status(500).json({ 
                message: 'Failed to restore state silently', 
                error: error.message 
            });
        }
    }

    // ADMIN ENDPOINT: Clear all states from database
    async clearAllStates(req, res, next) {
        try {
            console.log('⚠️ ADMIN WARNING: Clearing ALL states from database!');
            
            // Count documents before deletion
            const countBefore = await State.countDocuments();
            console.log(`📊 Found ${countBefore} states in database`);
            
            if (countBefore === 0) {
                return res.status(200).json({ 
                    message: 'Database is already empty',
                    deletedCount: 0
                });
            }
            
            // Delete all documents from states collection
            const deleteResult = await State.deleteMany({});
            
            console.log(`🗑️ Deleted ${deleteResult.deletedCount} states from database`);
            
            res.status(200).json({ 
                message: 'Successfully cleared all states from database',
                deletedCount: deleteResult.deletedCount,
                previousCount: countBefore
            });
            
        } catch (error) {
            console.error('❌ Error clearing all states:', error);
            res.status(500).json({ 
                message: 'Failed to clear states from database', 
                error: error.message 
            });
        }
    }
}

module.exports = new StatesController();