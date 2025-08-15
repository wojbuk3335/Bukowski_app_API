const State = require('../db/models/state');
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
}

module.exports = new WarehouseController();
