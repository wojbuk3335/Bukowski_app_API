const State = require('../db/models/state'); // Adjusted to use the correct model
const mongoose = require('mongoose');
const config = require('../config');
const Goods = require('../db/models/goods'); // Import Goods model
const Size = require('../db/models/size');   // Import Size model
const User = require('../db/models/user');   // Import User model
const History = require('../db/models/history'); // Import History model

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
            const warehouseStates = await State.find()
                .populate('fullName', 'fullName price priceExceptions discount_price category')
                .populate('size', 'Roz_Opis')
                .populate('sellingPoint', 'symbol');

            // Filter for warehouse items (symbol contains 'MAGAZYN' or 'magazyn')
            const warehouseItems = warehouseStates.filter(state => {
                const symbol = state.sellingPoint ? state.sellingPoint.symbol : '';
                return symbol.toLowerCase().includes('magazyn');
            });

            const sanitizedWarehouseItems = warehouseItems.map(state => ({
                _id: state._id,
                fullName: state.fullName,
                date: state.date,
                plec: state.plec,
                size: state.size || { Roz_Opis: '-' }, // Dla torebek, portfeli i pozostałego asortymentu gdy size jest null, pokaż "-"
                barcode: state.barcode,
                sellingPoint: state.sellingPoint,
                price: state.fullName ? state.fullName.price : 0,
                discount_price: state.fullName ? state.fullName.discount_price : 0,
                category: state.fullName ? state.fullName.category : null // Dodaj kategorię
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
                size: (state.fullName && (state.fullName.category === 'Torebki' || state.fullName.category === 'Portfele' || state.fullName.category === 'Pozostały asortyment')) 
                    ? '-' 
                    : (state.size ? state.size.Roz_Opis : 'Nieznany rozmiar'), // Handle bags, wallets, remaining products and null size
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
            
            if (goods.category === 'Torebki' || goods.category === 'Portfele' || goods.category === 'Pozostały asortyment' || req.body.size === '-') {
                // For bags, wallets, remaining products, don't create any size - use null and handle specially
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
                
                // For bags, wallets, remaining products don't check price exceptions as they don't use sizes
                let exception = null;
                if (goods.category !== 'Torebki' && goods.category !== 'Portfele' && goods.category !== 'Pozostały asortyment' && size && size.Roz_Opis !== 'TOREBKA') {
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

            // For bags, wallets, remaining products don't set size field; for other products, set size
            if (goods.category !== 'Torebki' && goods.category !== 'Portfele' && goods.category !== 'Pozostały asortyment' && req.body.size !== '-') {
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
            const productName = stateToDelete.fullName?.fullName || 'Nieznany produkt';
            const productSize = stateToDelete.size?.Roz_Opis || 'Nieznany rozmiar';
            const currentSymbol = stateToDelete.sellingPoint?.symbol || 'MAGAZYN';

            // For green items (transfer-same), create TWO history entries
            if (operationType === 'transfer-same') {
                // First entry: Transfer from MAGAZYN to selling point
                const transferHistoryEntry = new History({
                    collectionName: 'Stan',
                    operation: 'Przesunięto ze stanu',
                    product: productName,
                    size: productSize,
                    details: `Przesunięto produkt ze stanu ${productName} ${productSize} z MAGAZYN do ${targetSymbol}`,
                    userloggedinId: userloggedinId,
                    from: 'MAGAZYN',
                    to: targetSymbol
                });

                // Second entry: Sale from selling point
                const saleHistoryEntry = new History({
                    collectionName: 'Stan',
                    operation: 'Sprzedano ze stanu',
                    product: productName,
                    size: productSize,
                    details: `Sprzedano produkt ze stanu ${productName} ${productSize}`,
                    userloggedinId: userloggedinId,
                    from: targetSymbol,
                    to: 'Sprzedano'
                });

                // Save both history entries
                await Promise.all([
                    transferHistoryEntry.save(),
                    saleHistoryEntry.save()
                ]);

                console.log(`Created 2 history entries for green item (transfer-same): ${productName} ${productSize}`);

            } else if (operationType === 'transfer-from-magazyn') {
                // For orange items, create one transfer entry
                const historyEntry = new History({
                    collectionName: 'Stan',
                    operation: 'Przesunięto ze stanu',
                    product: productName,
                    size: productSize,
                    details: `Przesunięto produkt ze stanu ${productName} ${productSize}`,
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
                    const productName = state.fullName?.fullName || 'Nieznany produkt';
                    const productSize = state.size?.Roz_Opis || 'Nieznany rozmiar';
                    const from = state.sellingPoint?.symbol || 'MAGAZYN';
                    
                    let operation, details;
                    if (operationType === 'correction-undo-single' || operationType === 'correction-undo-transaction') {
                        // This is a correction/undo operation - product is being moved back to warehouse
                        operation = 'Przesunięto do magazynu (korekta)';
                        details = `Przesunięto produkt ${productName} ${productSize} z ${from} do ${targetSymbol} (korekta transakcji)`;
                    } else if (operationType === 'delete') {
                        operation = 'Sprzedano ze stanu';
                        details = `Sprzedano produkt ze stanu ${productName} ${productSize}`;
                    } else {
                        operation = 'Przesunięto ze stanu';
                        details = `Przesunięto produkt ze stanu ${productName} ${productSize}`;
                    }

                    const historyEntry = new History({
                        collectionName: 'Stan',
                        operation: operation,
                        product: productName,
                        size: productSize,
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
            
            const historyEntry = new History({
                collectionName: 'Stan',
                operation: 'Przywrócono do stanu',
                product: fullName,
                size: size,
                details: `Przywrócono produkt do stanu ${fullName} ${size} (anulowanie transakcji)`,
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

    // Get state movements report for specific user/selling point
    async getStateReport(req, res, next) {
        try {
            const { userId } = req.params;
            const { 
                startDate, 
                endDate, 
                productFilter = 'all',
                productId = null,
                category = null,
                manufacturerId = null,
                sizeId = null 
            } = req.query;

            if (!startDate || !endDate) {
                return res.status(400).json({ message: 'Start date and end date are required' });
            }

            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999); // Include the entire end date

            // Get user to determine selling point symbol
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            let targetSymbol = user.symbol;
            if (user.role?.toLowerCase() === 'magazyn') {
                targetSymbol = 'MAGAZYN';
            }

            // Build product filter query
            let productQuery = {};
            if (productFilter === 'specific' && productId) {
                productQuery._id = new mongoose.Types.ObjectId(productId);
            } else if (productFilter === 'category' && category) {
                productQuery.category = category;
            }
            // Add more filter logic as needed...

            // Get initial state (count at start date)
            const initialStateCount = await State.countDocuments({
                date: { $lt: start },
                'sellingPoint': await User.findOne({ symbol: targetSymbol }, '_id')
            });

            // Find all movements for this selling point in date range
            const movements = await State.find({
                date: { $gte: start, $lte: end }
            })
            .populate('fullName', 'fullName category')
            .populate('size', 'Roz_Opis')
            .populate('sellingPoint', 'symbol')
            .sort({ date: 1 });

            // Filter movements for this selling point
            const relevantMovements = movements.filter(state => {
                const symbol = state.sellingPoint ? state.sellingPoint.symbol : '';
                return symbol === targetSymbol;
            });

            // Get history records for this period to understand movement sources
            const History = require('../db/models/history');
            const Goods = require('../db/models/goods');
            const Size = require('../db/models/size');
            const historyRecords = await History.find({
                timestamp: { $gte: start, $lte: end },
                collectionName: 'Stan',
                operation: { 
                    $nin: [
                        'Dodano produkt', 
                        'Usuniecie', 
                        'Usunięcie',
                        'Aktualizacja',
                        'Dodano', 
                        'Usunięto',
                        'Zaktualizowano',
                        'DELETE',
                        'CREATE',
                        'UPDATE',
                        'Przeniesiono do korekt'
                    ] 
                }
            });





            // Process history records into operations (not State records!)
            // This ensures all movements are captured even if item no longer exists in State
            const operations = [];
            let totalAdded = 0;
            let totalSubtracted = 0;
            const processedOperations = new Set(); // Avoid duplicates

            // Get all history records for this point
            let targetHistory = historyRecords.filter(h => h.to === targetSymbol || h.from === targetSymbol);

            // Apply filters to history records
            if ((productFilter === 'product' || productFilter === 'specific') && productId) {
                const product = await Goods.findById(productId);
                if (product) {
                    targetHistory = targetHistory.filter(h => 
                        h.product && h.product.includes(product.fullName)
                    );
                }
            } else {
                // Filter by category
                if (category) {
                    if (['Rękawiczki', 'Paski'].includes(category)) {
                        // For subcategories, filter by product name patterns
                        const productPatterns = {
                            'Rękawiczki': /rękawic|glove|rekawic/i,
                            'Paski': /pasek|belt|paski/i
                        };
                        const pattern = productPatterns[category];
                        if (pattern) {
                            targetHistory = targetHistory.filter(h => 
                                h.product && pattern.test(h.product)
                            );
                        }
                    } else {
                        // For main categories, we need to get products from that category
                        const categoryProducts = await Goods.find({ category: category });
                        const productNames = categoryProducts.map(p => p.fullName);
                        targetHistory = targetHistory.filter(h => 
                            h.product && productNames.some(name => h.product.includes(name))
                        );
                    }
                }

                // Filter by manufacturer
                if (manufacturerId) {
                    const manufacturerProducts = await Goods.find({ manufacturer: manufacturerId });
                    const productNames = manufacturerProducts.map(p => p.fullName);
                    targetHistory = targetHistory.filter(h => 
                        h.product && productNames.some(name => h.product.includes(name))
                    );
                }

                // Filter by size
                if (sizeId) {
                    const size = await Size.findById(sizeId);
                    if (size) {
                        targetHistory = targetHistory.filter(h => 
                            h.product && h.product.includes(size.Roz_Opis)
                        );
                    }
                }
            }

            targetHistory.forEach(history => {
                // Create unique key to avoid processing same operation twice
                const operationKey = `${history.product}_${new Date(history.timestamp).getTime()}_${history.operation}`;
                if (processedOperations.has(operationKey)) {
                    return;
                }
                processedOperations.add(operationKey);
                // Extract product name and size from history
                let productName, sizeInfo;
                
                // Check if we have separate size field (new format)
                if (history.size && history.size !== '-') {
                    productName = history.product;
                    sizeInfo = history.size;
                } else {
                    // Fallback to old format - split product string
                    const productParts = history.product.split(' ');
                    productName = productParts.slice(0, -1).join(' '); // Everything except last part
                    sizeInfo = productParts[productParts.length - 1]; // Last part as size
                }

                let operationType = 'Nieznana operacja';
                let fromLocation = history.from || 'Nieznane';
                let toLocation = history.to || 'Nieznane';
                let isAddition = history.to === targetSymbol;

                // Determine operation type based on history operation and locations
                if (history.operation === 'Dodano do stanu (z magazynu)' && history.from === 'MAGAZYN' && history.to === targetSymbol) {
                    operationType = 'Dostawa';
                    fromLocation = 'MAGAZYN';
                    toLocation = targetSymbol;
                    isAddition = true;
                } else if (history.operation === 'Dodano do stanu' && history.from === 'Produkcja' && history.to === targetSymbol) {
                    operationType = 'Produkcja';
                    fromLocation = 'Produkcja';
                    toLocation = targetSymbol;
                    isAddition = true;
                } else if (history.operation === 'Odpisano ze stanu (transfer)' && history.from === targetSymbol) {
                    operationType = 'Transfer wych.';
                    fromLocation = targetSymbol;
                    toLocation = history.to;
                    isAddition = false;
                } else if (history.operation === 'Odpisano ze stanu (transfer)' && history.to === targetSymbol) {
                    operationType = 'Transfer przych.';
                    fromLocation = history.from;
                    toLocation = targetSymbol;
                    isAddition = true;
                } else if (history.operation === 'Dodano do stanu (transfer przychodzący)' && history.to === targetSymbol) {
                    operationType = 'Transfer przych.';
                    fromLocation = history.from;
                    toLocation = targetSymbol;
                    isAddition = true;
                } else if (history.operation === 'Odpisano ze stanu (sprzedaż)' && history.from === targetSymbol) {
                    operationType = 'Sprzedaż';
                    fromLocation = targetSymbol;
                    toLocation = 'Sprzedane';
                    isAddition = false;
                } else {
                    // Fallback - try to guess from operation name
                    if (history.operation.includes('Dodano') && history.to === targetSymbol) {
                        operationType = history.operation;
                        isAddition = true;
                    } else if (history.operation.includes('Odpisano') && history.from === targetSymbol) {
                        operationType = history.operation;
                        isAddition = false;
                    } else {
                        // Keep as unknown but log for debugging
                        console.log('Unknown operation:', {
                            operation: history.operation,
                            from: history.from,
                            to: history.to,
                            targetSymbol: targetSymbol,
                            product: history.product
                        });
                    }
                }

                const operation = {
                    date: new Date(history.timestamp),
                    product: productName,
                    size: sizeInfo && sizeInfo !== '-' ? sizeInfo : '-',
                    type: operationType,
                    from: fromLocation,
                    to: toLocation,
                    add: isAddition ? 1 : 0,
                    subtract: isAddition ? 0 : 1
                };

                operations.push(operation);
                
                if (isAddition) {
                    totalAdded += 1;
                } else {
                    totalSubtracted += 1;
                }
            });

            // Calculate final state
            const finalState = initialStateCount + totalAdded - totalSubtracted;

            const reportData = {
                initialState: { quantity: initialStateCount },
                operations: operations,
                summary: {
                    totalAdded: totalAdded,
                    totalSubtracted: totalSubtracted,
                    finalState: finalState
                }
            };

            res.status(200).json(reportData);

        } catch (error) {
            console.error('Error generating state report:', error);
            res.status(500).json({ 
                message: 'Failed to generate state report', 
                error: error.message 
            });
        }
    }

    // Get state inventory report for specific date
    async getStateInventory(req, res, next) {
        try {
            const { userId } = req.params;
            const { 
                date,
                productFilter = 'all',
                productId = null,
                category = null,
                manufacturerId = null,
                sizeId = null 
            } = req.query;

            if (!date) {
                return res.status(400).json({ message: 'Date is required' });
            }

            const inventoryDate = new Date(date);
            inventoryDate.setHours(23, 59, 59, 999);

            // Get user to determine selling point
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            let targetSymbol = user.symbol;
            if (user.role?.toLowerCase() === 'magazyn') {
                targetSymbol = 'MAGAZYN';
            }

            // Get all items in this selling point up to the specified date
            const inventoryItems = await State.find({
                date: { $lte: inventoryDate }
            })
            .populate('fullName', 'fullName category subcategory price manufacturer')
            .populate('sellingPoint', 'symbol')
            .populate('size', 'Roz_Opis');

            // Filter for this selling point
            const relevantItems = inventoryItems.filter(state => {
                const symbol = state.sellingPoint ? state.sellingPoint.symbol : '';
                return symbol === targetSymbol;
            });

            // Apply filters similar to getAllStatesInventory
            let filteredItems = relevantItems;

            // Filter by specific product
            if ((productFilter === 'product' || productFilter === 'specific') && productId) {
                const product = await Goods.findById(productId);
                if (product) {
                    filteredItems = filteredItems.filter(item => 
                        item.fullName?.fullName === product.fullName
                    );
                }
            } else {
                // Filter by category
                if (category) {
                    if (['Rękawiczki', 'Paski'].includes(category)) {
                        // For subcategories, filter within Pozostały asortyment
                        const subcategoryMapping = {
                            'Rękawiczki': 'gloves',
                            'Paski': 'belts'
                        };
                        filteredItems = filteredItems.filter(item => 
                            item.fullName?.category === 'Pozostały asortyment' && 
                            item.fullName?.subcategory === subcategoryMapping[category]
                        );
                    } else {
                        // For main categories
                        filteredItems = filteredItems.filter(item => 
                            item.fullName?.category === category
                        );
                    }
                }

                // Filter by manufacturer
                if (manufacturerId) {
                    filteredItems = filteredItems.filter(item => 
                        item.fullName?.manufacturer?.toString() === manufacturerId
                    );
                }

                // Filter by size
                if (sizeId) {
                    filteredItems = filteredItems.filter(item => 
                        item.size?._id?.toString() === sizeId
                    );
                }
            }

            // Group by product and size
            const inventory = {};
            filteredItems.forEach(item => {
                const productName = item.fullName ? item.fullName.fullName : 'Unknown Product';
                const sizeName = item.size ? item.size.Roz_Opis : 'No Size';
                const key = `${productName}_${sizeName}`;
                
                if (!inventory[key]) {
                    inventory[key] = {
                        product: productName,
                        size: sizeName,
                        quantity: 0,
                        price: item.fullName ? item.fullName.price : 0
                    };
                }
                inventory[key].quantity += 1;
            });

            const inventoryList = Object.values(inventory);
            const totalItems = inventoryList.reduce((sum, item) => sum + item.quantity, 0);

            const reportData = {
                date: inventoryDate,
                sellingPoint: user.sellingPoint || user.symbol,
                inventory: inventoryList,
                summary: {
                    totalItems: totalItems
                }
            };

            res.status(200).json(reportData);

        } catch (error) {
            console.error('Error generating state inventory:', error);
            res.status(500).json({ 
                message: 'Failed to generate state inventory', 
                error: error.message 
            });
        }
    }

    // Generate report for ALL STATES (aggregated data)
    async getAllStatesReport(req, res, next) {
        try {
            const { startDate, endDate, productFilter, productId, category, manufacturerId, sizeId } = req.query;
            
            
            // Get history for all users (not just one)
            let historyQuery = {
                timestamp: {
                    $gte: new Date(startDate + 'T00:00:00.000Z'),
                    $lte: new Date(endDate + 'T23:59:59.999Z')
                },
                operation: { 
                    $nin: [
                        'Dodano produkt', 
                        'Usuniecie', 
                        'Usunięcie',
                        'Aktualizacja',
                        'Dodano', 
                        'Usunięto',
                        'Zaktualizowano',
                        'DELETE',
                        'CREATE',
                        'UPDATE',
                        'Przeniesiono do korekt'
                    ] 
                }
            };

            // Apply multiple filters - build MongoDB query with all active filters
            let goodsFilter = {}; // Filter for Goods collection
            let productNames = []; // Names of products to search in history
            
            // 1. Filter by specific product
            if ((productFilter === 'product' || productFilter === 'specific') && productId) {
                const product = await Goods.findById(productId);
                if (product) {
                    productNames = [product.fullName];
                }
            } else {
                // 2. Filter by category
                if (category) {
                    if (['Rękawiczki', 'Paski'].includes(category)) {
                        // For subcategories, filter by subcategory within Pozostały asortyment
                        const subcategoryMapping = {
                            'Rękawiczki': 'gloves',
                            'Paski': 'belts'
                        };
                        goodsFilter.category = 'Pozostały asortyment';
                        goodsFilter.subcategory = subcategoryMapping[category];
                    } else {
                        // For main categories
                        goodsFilter.category = category;
                    }
                }
                
                // 3. Filter by manufacturer (can be combined with category)
                if (manufacturerId) {
                    goodsFilter.manufacturer = manufacturerId;
                }
                
                // Apply goods filters to find matching products
                if (Object.keys(goodsFilter).length > 0) {
                    const filteredGoods = await Goods.find(goodsFilter);
                    productNames = filteredGoods.map(g => g.fullName);
                }
            }
            
            // 4. Apply product name filters to history query
            if (productNames.length > 0) {
                historyQuery.$or = productNames.map(name => ({
                    product: { $regex: name, $options: 'i' }
                }));
            }
            
            // Note: Size filtering is done after processing, not in the database query
            // This is because we extract sizes from product names, not from details.size field

            const historyEntries = await History.find(historyQuery)
                .sort({ timestamp: -1 })
                .limit(1000); // Limit for performance

            // Group transfers to avoid duplicates (blue/yellow processing creates 2 entries for 1 transfer)
            const transferGroups = new Map();
            const nonTransferEntries = [];

            historyEntries.forEach(entry => {
                if (entry.operation && entry.operation.includes('transfer')) {
                    // Create unique key for transfer grouping - use product and approximate time (same minute)
                    const timeKey = new Date(entry.timestamp).toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
                    const transferKey = `${entry.product}_${timeKey}`;
                    
                    if (!transferGroups.has(transferKey)) {
                        transferGroups.set(transferKey, []);
                    }
                    transferGroups.get(transferKey).push(entry);
                } else {
                    nonTransferEntries.push(entry);
                }
            });

            // Process grouped transfers
            const processedTransfers = [];
            transferGroups.forEach((entries) => {
                if (entries.length >= 2) {
                    // Multiple entries - combine them into one
                    const sourceEntry = entries.find(e => e.operation.includes('Odpisano')) || entries[0];
                    const targetEntry = entries.find(e => e.operation.includes('Dodano') && e.operation.includes('przychodzacy')) || entries[1];
                    
                    let sourceDetails = {}, targetDetails = {};
                    try {
                        sourceDetails = JSON.parse(sourceEntry?.details || '{}');
                        targetDetails = JSON.parse(targetEntry?.details || '{}');
                    } catch (e) {}

                    // Create combined transfer entry using the more recent timestamp
                    const combinedEntry = {
                        timestamp: targetEntry?.timestamp || sourceEntry?.timestamp,
                        product: targetEntry?.product || sourceEntry?.product,
                        operation: 'Transfer międzypunktowy',
                        details: JSON.stringify({
                            source: sourceDetails.source || sourceEntry?.from || 'M',
                            destination: targetDetails.destination || targetEntry?.to || targetDetails.targetUser || 'T',
                            barcode: sourceDetails.barcode || targetDetails.barcode,
                            size: sourceDetails.size || targetDetails.size
                        })
                    };
                    processedTransfers.push(combinedEntry);
                } else {
                    // Single entry - keep as is 
                    const entry = entries[0];
                    // Include single transfer operations (like corrections) and other non-incoming operations
                    if (!entry.operation.includes('przychodzacy')) {
                        processedTransfers.push(entry);
                    }
                }
            });

            // Combine processed transfers with non-transfer entries
            const allProcessedEntries = [...processedTransfers, ...nonTransferEntries];

            // Format the data similarly to single user report
            let movements = allProcessedEntries.map(entry => {
                let details = {};
                try {
                    details = JSON.parse(entry.details || '{}');
                } catch (e) {
                    details = {};
                }

                // Extract size - check new size field first, then details.size, then product name
                let sizeDisplay = '-';
                
                // First check if we have the new separate size field
                if (entry.size && entry.size !== '-') {
                    sizeDisplay = entry.size;
                } else if (details.size && details.size !== '-' && 
                    !(details.size.length === 24 && /^[0-9a-fA-F]{24}$/.test(details.size))) {
                    // Use details.size if it's not an ObjectId
                    sizeDisplay = details.size;
                } else {
                    // Fallback to extracting size from product name
                    const sizeMatch = entry.product?.match(/\b(XXS|XS|S|M|L|XL|XXL|3XL|4XL|5XL)\b/);
                    sizeDisplay = sizeMatch ? sizeMatch[1] : '-';
                }

                // Clean product name if we have separate size field
                let productName = entry.product;
                if (entry.size && entry.size !== '-') {
                    // Remove size from product name if it exists at the end
                    productName = entry.product.replace(new RegExp(`\\s+${entry.size}$`), '');
                }

                // Determine if this is addition or subtraction based on operation
                // For "All States" report, we need to consider global inventory impact
                let add = 0, subtract = 0;
                const operation = entry.operation || '';
                
                // Operations that TRULY ADD to global inventory (new items enter system)
                if (operation === 'Dodano do stanu' || // From production
                    operation === 'Dodano do magazynu' || // Direct warehouse addition
                    operation.includes('Zwrot')) { // Returns add back
                    add = 1;
                }
                // Operations that TRULY REMOVE from global inventory (items leave system)
                else if (operation.includes('Odpisano ze stanu (sprzedaż)') ||
                         operation.includes('Usunięto') ||
                         operation.includes('Sprzedaż')) {
                    subtract = 1;
                }
                // Internal transfers (show both add and subtract to indicate movement)
                else if (operation === 'Dodano do stanu (z magazynu)' ||
                         operation.includes('Transfer międzypunktowy') ||
                         operation.includes('Przeniesienie') ||
                         operation.includes('Transfer przychodzący') ||
                         operation.includes('Transfer wychodzący')) {
                    add = 1;      // Show that item was added to destination
                    subtract = 1; // Show that item was removed from source
                    // Net effect: +1 - 1 = 0 (globally neutral)
                }

                return {
                    date: entry.timestamp,
                    operation: entry.operation,
                    product: productName,
                    size: sizeDisplay,
                    add: add,
                    subtract: subtract,
                    barcode: details.barcode || '-',
                    source: details.source || entry.from || '-',
                    destination: details.destination || details.targetUser || entry.to || '-',
                    notes: details.notes || '-',
                    sellingPoint: details.targetUser || details.sourceUser || entry.to || 'System'
                };
            });

            // Filter by size after processing (since we extract sizes from product names)
            if (sizeId) {
                const size = await Size.findById(sizeId);
                if (size) {
                    movements = movements.filter(movement => 
                        movement.size === size.Roz_Opis
                    );
                }
            }

            // Calculate totals for summary
            const totalAdded = movements.reduce((sum, movement) => sum + movement.add, 0);
            const totalSubtracted = movements.reduce((sum, movement) => sum + movement.subtract, 0);

            res.status(200).json({
                movements: movements,
                summary: {
                    totalMovements: movements.length,
                    totalAdded: totalAdded,
                    totalSubtracted: totalSubtracted,
                    finalState: totalAdded - totalSubtracted,
                    dateRange: { startDate, endDate },
                    reportType: 'All States Movement Report'
                }
            });

        } catch (error) {
            console.error('Error generating all states report:', error);
            res.status(500).json({ 
                message: 'Failed to generate all states report', 
                error: error.message 
            });
        }
    }

    // Generate inventory for ALL STATES (current state across all points)
    async getAllStatesInventory(req, res, next) {
        try {
            const { date, productFilter, productId, category, manufacturerId, sizeId } = req.query;
            
            
            // Get all current states (this gives us current inventory across all points)
            let stateQuery = {};
            
            // Apply multiple filters - build MongoDB query with all active filters
            let goodsFilter = {}; // Filter for Goods collection
            
            // 1. Filter by specific product
            if ((productFilter === 'product' || productFilter === 'specific') && productId) {
                stateQuery.fullName = productId;
            } else {
                // 2. Filter by category
                if (category) {
                    if (['Rękawiczki', 'Paski'].includes(category)) {
                        // For subcategories, filter by subcategory within Pozostały asortyment
                        const subcategoryMapping = {
                            'Rękawiczki': 'gloves',
                            'Paski': 'belts'
                        };
                        goodsFilter.category = 'Pozostały asortyment';
                        goodsFilter.subcategory = subcategoryMapping[category];
                    } else {
                        // For main categories
                        goodsFilter.category = category;
                    }
                }
                
                // 3. Filter by manufacturer (can be combined with category)
                if (manufacturerId) {
                    goodsFilter.manufacturer = manufacturerId;
                }
                
                // Apply goods filters to find matching products
                if (Object.keys(goodsFilter).length > 0) {
                    const filteredGoods = await Goods.find(goodsFilter);
                    stateQuery.fullName = { $in: filteredGoods.map(g => g._id) };
                }
            }
            
            // 4. Filter by size (can be combined with any other filter)
            if (sizeId) {
                stateQuery.size = sizeId;
            }

            const states = await State.find(stateQuery)
                .populate('fullName', 'fullName category')
                .populate('size', 'Roz_Opis')
                .populate('sellingPoint', 'name symbol');

            // Group by product+size combination and count quantities
            const inventory = {};
            
            states.forEach(state => {
                const product = state.fullName?.fullName || 'Unknown Product';
                const size = state.size?.Roz_Opis || '-';
                const sellingPoint = state.sellingPoint?.name || state.sellingPoint?.symbol || 'Unknown';
                
                // Create unique key for product+size combination
                const key = `${product}_${size}`;
                
                if (!inventory[key]) {
                    inventory[key] = {
                        product: product,
                        size: size,
                        quantity: 0,
                        price: state.price,
                        sellingPoints: new Set(),
                        barcodes: new Set()
                    };
                }
                
                inventory[key].quantity += 1;
                inventory[key].sellingPoints.add(sellingPoint);
                inventory[key].barcodes.add(state.barcode);
            });

            // Convert to array and format for response
            const inventoryList = Object.values(inventory).map(item => ({
                product: item.product,
                size: item.size,
                quantity: item.quantity,
                price: item.price,
                sellingPoints: Array.from(item.sellingPoints).join(', '),
                barcodes: Array.from(item.barcodes).join(', ')
            }));

            const totalItems = inventoryList.reduce((sum, item) => sum + item.quantity, 0);

            res.status(200).json({
                inventory: inventoryList,
                summary: {
                    totalItems: totalItems,
                    date: date,
                    reportType: 'All States Inventory Report'
                }
            });

        } catch (error) {
            console.error('Error generating all states inventory:', error);
            res.status(500).json({ 
                message: 'Failed to generate all states inventory', 
                error: error.message 
            });
        }
    }

    // Check processing status for all states
    async checkProcessingStatus(req, res, next) {
        try {
            const { date } = req.query;
            console.log('🔍 Processing status check requested for date:', date);
            
            if (!date) {
                return res.status(400).json({ message: 'Date is required' });
            }

            const checkDate = new Date(date);
            checkDate.setHours(0, 0, 0, 0);
            const nextDay = new Date(checkDate);
            nextDay.setDate(nextDay.getDate() + 1);

            console.log('📅 Checking date range:', checkDate, 'to', nextDay);

            // Import Transfer and Sales models
            const Transfer = require('../db/models/transfer');
            const Sales = require('../db/models/sales');

            // Get all Transfers for this date
            const transfers = await Transfer.find({
                date: {
                    $gte: checkDate,
                    $lt: nextDay
                }
            });

            console.log(`📊 Found ${transfers.length} transfers for date ${date}`);

            // Get all Sales for this date
            const sales = await Sales.find({
                date: {
                    $gte: checkDate,
                    $lt: nextDay
                }
            });

            console.log(`📊 Found ${sales.length} sales for date ${date}`);

            let unprocessedItems = [];

            // Check each transfer
            for (const transfer of transfers) {
                console.log(`🔍 Checking transfer:`, {
                    id: transfer._id,
                    fullName: transfer.fullName,
                    from: transfer.transfer_from,
                    to: transfer.transfer_to,
                    blueProcessed: transfer.blueProcessed,
                    yellowProcessed: transfer.yellowProcessed,
                    date: transfer.date
                });

                let needsProcessing = false;
                let missingProcessing = [];

                // Check if blue processing is needed (outgoing from source)
                if (!transfer.blueProcessed) {
                    needsProcessing = true;
                    missingProcessing.push('blue (wychodzący)');
                    console.log('❌ Transfer not blue processed');
                } else {
                    console.log('✅ Transfer already blue processed');
                }

                // Check if yellow processing is needed (incoming to destination)
                if (!transfer.yellowProcessed) {
                    needsProcessing = true;
                    missingProcessing.push('yellow (przychodzący)');
                    console.log('❌ Transfer not yellow processed');
                } else {
                    console.log('✅ Transfer already yellow processed');
                }

                if (needsProcessing) {
                    unprocessedItems.push({
                        type: 'transfer',
                        transferId: transfer._id,
                        product: transfer.fullName,
                        from: transfer.transfer_from,
                        to: transfer.transfer_to,
                        date: transfer.date,
                        missingProcessing: missingProcessing,
                        blueProcessed: transfer.blueProcessed,
                        yellowProcessed: transfer.yellowProcessed
                    });
                }
            }

            // Check each sale
            for (const sale of sales) {
                console.log(`🔍 Checking sale:`, {
                    id: sale._id,
                    product: sale.fullName,
                    sellingPoint: sale.sellingPoint,
                    from: sale.from,
                    processed: sale.processed,
                    date: sale.date
                });

                if (!sale.processed) {
                    unprocessedItems.push({
                        type: 'sale',
                        saleId: sale._id,
                        product: sale.fullName,
                        sellingPoint: sale.sellingPoint,
                        from: sale.from,
                        date: sale.date,
                        missingProcessing: ['blue (sprzedaż)'],
                        processed: sale.processed
                    });
                    console.log('❌ Sale not processed');
                } else {
                    console.log('✅ Sale already processed');
                }
            }

            const totalOperations = transfers.length + sales.length;
            const allProcessed = unprocessedItems.length === 0;
            console.log(`✅ Processing status: ${allProcessed ? 'ALL PROCESSED' : 'SOME UNPROCESSED'} (${unprocessedItems.length} unprocessed out of ${totalOperations} total)`);

            res.status(200).json({
                date: date,
                allProcessed: allProcessed,
                totalEntries: totalOperations,
                unprocessedCount: unprocessedItems.length,
                unprocessedItems: unprocessedItems,
                transfersFound: transfers.length,
                salesFound: sales.length,
                message: allProcessed 
                    ? 'Wszystkie produkty z dnia zostały przetworzone' 
                    : 'UWAGA! Nie wszystkie produkty z dnia zostały przetworzone'
            });

        } catch (error) {
            console.error('❌ Error checking processing status:', error);
            res.status(500).json({ 
                message: 'Failed to check processing status', 
                error: error.message 
            });
        }
    }
}

module.exports = new StatesController();