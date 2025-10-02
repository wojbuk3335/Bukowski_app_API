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
}

module.exports = new WarehouseController();
