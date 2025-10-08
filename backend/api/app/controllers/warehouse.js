const mongoose = require('mongoose');
const State = require('../db/models/state');
const Warehouse = require('../db/models/warehouse');
const History = require('../db/models/history');
const User = require('../db/models/user');

class WarehouseController {
    // Move item from warehouse to user (not a transfer, just a state change)
    moveItemToUser = async (req, res) => {
        try {
            console.log('Received warehouse move data:', req.body); // Debug log
            
            const { productId, targetUserSymbol, productDetails } = req.body;
            
            if (!productId || !targetUserSymbol) {
                return res.status(400).json({ 
                    error: 'Product ID and target user symbol are required' 
                });
            }

            // Find the target user by symbol
            const targetUser = await User.findOne({ symbol: targetUserSymbol });
            if (!targetUser) {
                return res.status(404).json({ 
                    error: `User with symbol ${targetUserSymbol} not found` 
                });
            }

            // Find the item in warehouse (state)
            const warehouseItem = await State.findById(productId);
            if (!warehouseItem) {
                return res.status(404).json({ 
                    error: 'Product not found in warehouse' 
                });
            }

            // Update the item's location to the target user
            warehouseItem.sellingPoint = targetUser._id;
            await warehouseItem.save();

            // Create history entry
            const historyEntry = new History({
                collectionName: 'Stan',
                operation: 'Przeniesienie magazynowe',
                product: `${productDetails?.fullName || 'Nieznany produkt'} ${productDetails?.size || 'Nieznany rozmiar'}`,
                details: `Przeniesiono produkt z magazynu do ${targetUserSymbol}`,
                userloggedinId: req.user ? req.user._id : null,
                from: 'Magazyn',
                to: targetUserSymbol
            });

            await historyEntry.save();
            console.log('Warehouse move completed successfully'); // Debug log

            res.status(200).json({
                message: 'Product moved successfully',
                item: warehouseItem
            });

        } catch (error) {
            console.log('Warehouse move error:', error); // Debug log
            res.status(500).json({ error: error.message });
        }
    };

    // Add item to warehouse (create new state with MAGAZYN user)
    addToWarehouse = async (req, res) => {
        try {
            console.log('Adding item to warehouse:', req.body);
            
            const { goodsId, sizeId, price, discount_price, barcode } = req.body;
            
            if (!goodsId || !price || !barcode) {
                return res.status(400).json({ 
                    error: 'Goods ID, price and barcode are required' 
                });
            }

            // Find MAGAZYN user
            const magazynUser = await User.findOne({ symbol: 'MAGAZYN' });
            if (!magazynUser) {
                return res.status(404).json({ error: 'MAGAZYN user not found' });
            }

            // Create new state entry for warehouse (State model, not Warehouse)
            const warehouseItem = new State({
                _id: new mongoose.Types.ObjectId(),
                fullName: goodsId, // goodsId should be ObjectId referring to Goods
                date: new Date(),
                barcode: barcode,
                size: sizeId || null, // Size is optional (null for bags)
                sellingPoint: magazynUser._id,
                price: price,
                discount_price: discount_price || null
            });

            await warehouseItem.save();

            res.status(201).json({
                message: 'Item added to warehouse successfully',
                item: warehouseItem
            });

        } catch (error) {
            console.error('Error adding item to warehouse:', error);
            res.status(500).json({ error: error.message });
        }
    };

    // Generate warehouse report
    generateReport = async (req, res) => {
        try {
            const { startDate, endDate, productFilter, productId } = req.query;
            
            if (!startDate || !endDate) {
                return res.status(400).json({ 
                    error: 'Start date and end date are required' 
                });
            }

            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999); // Include the entire end date

            // Find MAGAZYN user
            const magazynUser = await User.findOne({ symbol: 'MAGAZYN' });
            if (!magazynUser) {
                return res.status(404).json({ error: 'MAGAZYN user not found' });
            }

            // Build query for history operations
            let historyQuery = {
                timestamp: { $gte: start, $lte: end },
                $or: [
                    { operation: 'Dodano do stanu (z magazynu)' }, // Transfer from warehouse
                    { operation: 'Przeniesienie magazynowe' }, // Warehouse movement
                    { operation: 'Dodano do magazynu' }, // Added to warehouse (zatowarowanie)
                    { operation: 'Usunięto z magazynu' }, // Removed from warehouse
                    { operation: 'Dodano do stanu' } // General state addition (could be to warehouse)
                ]
            };

            // If specific product is selected, filter by product name
            if (productFilter === 'specific' && productId) {
                const mongoose = require('mongoose');
                const Goods = require('../db/models/goods');
                
                const product = await Goods.findById(productId);
                if (product) {
                    historyQuery.product = { $regex: product.fullName, $options: 'i' };
                }
            }

            // Get initial state (count at start date)
            let initialStateQuery = {
                sellingPoint: magazynUser._id,
                date: { $lt: start }
            };

            if (productFilter === 'specific' && productId) {
                initialStateQuery.fullName = productId;
            }

            const initialStateCount = await State.countDocuments(initialStateQuery);

            // Get operations within date range
            const operations = await History.find(historyQuery)
                .sort({ timestamp: 1 })
                .lean();

            // Process operations into report format
            const reportOperations = [];
            let totalAdded = 0;
            let totalSubtracted = 0;

            for (let operation of operations) {
                let reportItem = {
                    date: operation.timestamp,
                    type: '',
                    add: 0,
                    subtract: 0,
                    product: operation.product
                };

                switch (operation.operation) {
                    case 'Dodano do stanu (z magazynu)':
                        // Transfer from warehouse to point (subtract from warehouse)
                        let details = {};
                        try {
                            details = JSON.parse(operation.details || '{}');
                        } catch (e) {
                            details = {};
                        }
                        const targetPoint = details.sellingPointSymbol || 'Nieznany punkt';
                        reportItem.type = `Transfer do ${targetPoint}`;
                        reportItem.subtract = 1;
                        totalSubtracted += 1;
                        break;
                        
                    case 'Dodano do magazynu':
                        // Added to warehouse (zatowarowanie)
                        reportItem.type = 'Zatowarowanie';
                        reportItem.add = 1;
                        totalAdded += 1;
                        break;

                    case 'Dodano do stanu':
                        // Check if it's added to MAGAZYN user or if operation is about warehouse
                        let stateDetails = {};
                        try {
                            stateDetails = JSON.parse(operation.details || '{}');
                        } catch (e) {
                            stateDetails = {};
                        }
                        
                        // Check if target is MAGAZYN or if the operation text contains warehouse info
                        if (stateDetails.sellingPointSymbol === 'MAGAZYN' || 
                            operation.to === 'MAGAZYN' ||
                            (operation.details && operation.details.includes('MAGAZYN'))) {
                            reportItem.type = 'Zatowarowanie';
                            reportItem.add = 1;
                            totalAdded += 1;
                        }
                        break;
                        
                    case 'Usunięto z magazynu':
                        // Removed from warehouse
                        reportItem.type = 'Usunięto z magazynu';
                        reportItem.subtract = 1;
                        totalSubtracted += 1;
                        break;
                        
                    case 'Przeniesienie magazynowe':
                        // Warehouse movement
                        if (operation.from === 'Magazyn') {
                            reportItem.type = `Transfer do ${operation.to}`;
                            reportItem.subtract = 1;
                            totalSubtracted += 1;
                        } else if (operation.to === 'Magazyn') {
                            reportItem.type = `Zwrot z ${operation.from}`;
                            reportItem.add = 1;
                            totalAdded += 1;
                        }
                        break;
                }

                if (reportItem.type) {
                    reportOperations.push(reportItem);
                }
            }

            // Calculate final state
            const balance = totalAdded - totalSubtracted;
            const finalState = initialStateCount + balance;

            const reportData = {
                initialState: {
                    date: start,
                    quantity: initialStateCount
                },
                operations: reportOperations,
                summary: {
                    totalAdded,
                    totalSubtracted,
                    balance,
                    finalState,
                    startDate: start,
                    endDate: end
                }
            };

            res.status(200).json(reportData);

        } catch (error) {
            console.error('Error generating warehouse report:', error);
            res.status(500).json({ error: error.message });
        }
    };
}

module.exports = new WarehouseController();
