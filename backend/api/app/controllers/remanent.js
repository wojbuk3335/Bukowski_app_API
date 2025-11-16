const Remanent = require('../db/models/remanent');
const State = require('../db/models/state');
const mongoose = require('mongoose');

class RemanentController {
    // Save remanent items to database
    async saveRemanentItems(req, res, next) {
        try {
            const { items, timestamp, userId } = req.body;
            
            if (!items || !Array.isArray(items) || items.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Items are required and must be a non-empty array'
                });
            }

            // Get user info from token
            const userIdFromToken = req.userData ? req.userData.userId : userId;
            const sellingPoint = req.userData ? (req.userData.symbol || req.userData.location || 'Unknown') : 'Unknown';

            // Create new remanent document
            const remanent = new Remanent({
                userId: userIdFromToken,
                sellingPoint: sellingPoint,
                items: items,
                timestamp: timestamp || new Date()
            });

            // Save to database
            const savedRemanent = await remanent.save();

            console.log(`✅ Remanent saved: ${items.length} items for ${sellingPoint}`);

            res.status(201).json({
                success: true,
                message: 'Remanent items saved successfully',
                data: {
                    id: savedRemanent._id,
                    totalItems: savedRemanent.totalItems,
                    totalValue: savedRemanent.totalValue,
                    timestamp: savedRemanent.timestamp,
                    sellingPoint: savedRemanent.sellingPoint
                }
            });

        } catch (error) {
            console.error('❌ Error saving remanent items:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while saving remanent items',
                error: error.message
            });
        }
    }

    // Get all remanent records for a user
    async getRemanentRecords(req, res, next) {
        try {
            const userId = req.userData.userId;
            const { page = 1, limit = 10, startDate, endDate } = req.query;

            // Build query
            let query = { userId: userId };

            // Add date filter if provided
            if (startDate || endDate) {
                query.timestamp = {};
                if (startDate) {
                    query.timestamp.$gte = new Date(startDate);
                }
                if (endDate) {
                    query.timestamp.$lte = new Date(endDate);
                }
            }

            // Execute query with pagination
            const remanentRecords = await Remanent.find(query)
                .sort({ timestamp: -1 })
                .skip((page - 1) * limit)
                .limit(parseInt(limit))
                .populate('userId', 'name username symbol location');

            const total = await Remanent.countDocuments(query);

            res.status(200).json({
                success: true,
                data: remanentRecords,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: total,
                    pages: Math.ceil(total / limit)
                }
            });

        } catch (error) {
            console.error('❌ Error fetching remanent records:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while fetching remanent records',
                error: error.message
            });
        }
    }

    // Get current state for comparison
    async getCurrentState(req, res, next) {
        try {
            const userId = req.userData.userId;
            const sellingPoint = req.userData.symbol || req.userData.location;

            // Get current state items for the user's selling point
            const stateItems = await State.find({ 
                'sellingPoint.symbol': sellingPoint 
            })
            .populate('fullName', 'fullName code')
            .populate('size', 'Roz_Opis')
            .populate('sellingPoint', 'symbol');

            // Format the data for frontend
            const formattedState = stateItems.map(item => ({
                id: item._id,
                fullName: item.fullName ? item.fullName.fullName : 'Unknown',
                name: item.fullName ? item.fullName.fullName : 'Unknown',
                code: item.fullName ? item.fullName.code : item.barcode,
                barcode: item.barcode,
                size: item.size ? item.size.Roz_Opis : 'Unknown',
                quantity: item.quantity || 1,
                sellingPoint: item.sellingPoint ? item.sellingPoint.symbol : sellingPoint
            }));

            res.status(200).json({
                success: true,
                data: formattedState,
                count: formattedState.length
            });

        } catch (error) {
            console.error('❌ Error fetching current state:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while fetching current state',
                error: error.message
            });
        }
    }

    // Get remanent statistics
    async getRemanentStats(req, res, next) {
        try {
            const userId = req.userData.userId;
            const { startDate, endDate } = req.query;

            // Build date filter
            let dateFilter = { userId: userId };
            if (startDate || endDate) {
                dateFilter.timestamp = {};
                if (startDate) {
                    dateFilter.timestamp.$gte = new Date(startDate);
                }
                if (endDate) {
                    dateFilter.timestamp.$lte = new Date(endDate);
                }
            }

            // Get statistics
            const stats = await Remanent.aggregate([
                { $match: dateFilter },
                {
                    $group: {
                        _id: null,
                        totalRecords: { $sum: 1 },
                        totalItems: { $sum: '$totalItems' },
                        totalValue: { $sum: '$totalValue' },
                        avgItemsPerRecord: { $avg: '$totalItems' },
                        avgValuePerRecord: { $avg: '$totalValue' }
                    }
                }
            ]);

            const result = stats.length > 0 ? stats[0] : {
                totalRecords: 0,
                totalItems: 0,
                totalValue: 0,
                avgItemsPerRecord: 0,
                avgValuePerRecord: 0
            };

            res.status(200).json({
                success: true,
                data: result
            });

        } catch (error) {
            console.error('❌ Error fetching remanent stats:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while fetching remanent statistics',
                error: error.message
            });
        }
    }

    // Delete a remanent record
    async deleteRemanentRecord(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.userData.userId;

            // Find and delete the record (only if it belongs to the user)
            const deletedRecord = await Remanent.findOneAndDelete({
                _id: id,
                userId: userId
            });

            if (!deletedRecord) {
                return res.status(404).json({
                    success: false,
                    message: 'Remanent record not found or you do not have permission to delete it'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Remanent record deleted successfully',
                data: {
                    id: deletedRecord._id,
                    timestamp: deletedRecord.timestamp
                }
            });

        } catch (error) {
            console.error('❌ Error deleting remanent record:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while deleting remanent record',
                error: error.message
            });
        }
    }

    // Delete a specific item from remanent record
    async deleteRemanentItem(req, res, next) {
        try {
            const { remanentId, itemId } = req.params;
            const userId = req.userData.userId;

            // Find the remanent record
            const remanentRecord = await Remanent.findOne({
                _id: remanentId,
                userId: userId
            });

            if (!remanentRecord) {
                return res.status(404).json({
                    success: false,
                    message: 'Remanent record not found or you do not have permission to access it'
                });
            }

            // Find the item to remove
            const itemIndex = remanentRecord.items.findIndex(item => item._id.toString() === itemId);
            
            if (itemIndex === -1) {
                return res.status(404).json({
                    success: false,
                    message: 'Item not found in remanent record'
                });
            }

            // Remove the item
            const removedItem = remanentRecord.items[itemIndex];
            remanentRecord.items.splice(itemIndex, 1);

            // If no items left, delete the entire record
            if (remanentRecord.items.length === 0) {
                await Remanent.findByIdAndDelete(remanentId);
                return res.status(200).json({
                    success: true,
                    message: 'Last item removed, remanent record deleted',
                    data: {
                        action: 'record_deleted',
                        remanentId: remanentId,
                        removedItem: removedItem
                    }
                });
            } else {
                // Save the updated record
                await remanentRecord.save();
                
                return res.status(200).json({
                    success: true,
                    message: 'Item removed from remanent record',
                    data: {
                        action: 'item_removed',
                        remanentId: remanentId,
                        removedItem: removedItem,
                        remainingItems: remanentRecord.items.length
                    }
                });
            }

        } catch (error) {
            console.error('❌ Error deleting remanent item:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while deleting remanent item',
                error: error.message
            });
        }
    }
}

module.exports = new RemanentController();