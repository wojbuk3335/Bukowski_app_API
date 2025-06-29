const History = require('../db/models/history');

class HistoryController {
    getAllHistory = async (req, res, next) => {
        try {
            const history = await History.find()
                .populate('userloggedinId', 'username') // Ensure username is populated correctly
                .select('collectionName operation from to timestamp userloggedinId product details transactionId'); // Include transactionId in the response
            res.status(200).json(history);
        } catch (err) {
            console.log(err);
            res.status(500).json({
                error: err
            });
        }
    };

    removeAllHistory = async (req, res, next) => {
        try {
            await History.deleteMany({});
            res.status(200).json({ message: 'History cleared successfully' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    };

    deleteByTransactionId = async (req, res, next) => {
        try {
            const { transactionId } = req.params;
            
            console.log('Attempting to delete history records for transactionId:', transactionId);
            
            // First, let's check how many records exist with this transactionId
            const existingRecords = await History.find({ transactionId: transactionId });
            console.log('Found existing records with transactionId:', existingRecords.length);
            console.log('Existing records:', existingRecords.map(r => ({
                id: r._id,
                operation: r.operation,
                product: r.product,
                transactionId: r.transactionId
            })));
            
            // Find and delete all history records with this transactionId
            const deletedRecords = await History.deleteMany({ transactionId: transactionId });
            
            console.log('Deleted records count:', deletedRecords.deletedCount);
            
            if (deletedRecords.deletedCount === 0) {
                return res.status(404).json({ 
                    message: 'No history records found for this transaction ID',
                    transactionId: transactionId,
                    foundRecords: existingRecords.length
                });
            }
            
            res.status(200).json({ 
                message: 'History records deleted successfully',
                deletedCount: deletedRecords.deletedCount,
                transactionId: transactionId,
                foundRecords: existingRecords.length
            });
        } catch (error) {
            console.error('Error deleting history records by transactionId:', error);
            res.status(500).json({ 
                message: 'Error deleting history records',
                error: error.message 
            });
        }
    };

    deleteByTransactionDetails = async (req, res, next) => {
        try {
            const { timestamp, processedItems } = req.body;
            
            console.log('Attempting to delete history records by transaction details');
            console.log('Timestamp:', timestamp);
            console.log('ProcessedItems count:', processedItems?.length);
            
            if (!processedItems || processedItems.length === 0) {
                return res.status(400).json({ 
                    message: 'No processed items provided' 
                });
            }
            
            // Convert timestamp to Date object
            const transactionTime = new Date(timestamp);
            
            // Create a broader time range (30 minutes) to catch records
            const timeBuffer = 30 * 60 * 1000; // 30 minutes in milliseconds
            const startTime = new Date(transactionTime.getTime() - timeBuffer);
            const endTime = new Date(transactionTime.getTime() + timeBuffer);
            
            console.log(`Time range: ${startTime.toISOString()} to ${endTime.toISOString()}`);
            
            let totalDeleted = 0;
            const deletedRecords = [];
            
            // For each processed item, find and delete matching history records
            for (const item of processedItems) {
                const productName = `${item.fullName} ${item.size}`;
                
                console.log(`Looking for records with product: ${productName}`);
                
                // Find all history records for this product within the time range
                const recordsToDelete = await History.find({
                    product: productName,
                    timestamp: {
                        $gte: startTime,
                        $lte: endTime
                    },
                    // Look for typical operations that occur during transactions
                    $or: [
                        { operation: 'Przesunięto ze stanu' },
                        { operation: 'Przeniesiono w ramach stanu' },
                        { operation: 'Usunięto ze stanu' },
                        { operation: 'Dodano do stanu' },
                        { operation: 'Sprzedano' },
                        { operation: 'Przywrócono stan' }
                    ]
                });
                
                console.log(`Found ${recordsToDelete.length} records to delete for ${productName}`);
                
                if (recordsToDelete.length > 0) {
                    // Log details of records being deleted for debugging
                    recordsToDelete.forEach(record => {
                        console.log(`Deleting record: ${record.operation} - ${record.product} - ${record.timestamp}`);
                        deletedRecords.push({
                            id: record._id,
                            operation: record.operation,
                            product: record.product,
                            timestamp: record.timestamp
                        });
                    });
                    
                    const deleteResult = await History.deleteMany({
                        _id: { $in: recordsToDelete.map(r => r._id) }
                    });
                    
                    totalDeleted += deleteResult.deletedCount;
                    console.log(`Successfully deleted ${deleteResult.deletedCount} records for ${productName}`);
                }
            }
            
            console.log(`Total deleted records: ${totalDeleted}`);
            
            res.status(200).json({ 
                message: 'History records deleted by transaction details',
                deletedCount: totalDeleted,
                processedItemsCount: processedItems.length,
                deletedRecords: deletedRecords
            });
            
        } catch (error) {
            console.error('Error deleting history records by transaction details:', error);
            res.status(500).json({ 
                message: 'Error deleting history records by transaction details',
                error: error.message 
            });
        }
    }

    deleteSingleItem = async (req, res, next) => {
        try {
            const { transactionId, itemDetails } = req.body;
            
            console.log('Attempting to delete single item from history');
            console.log('TransactionId:', transactionId);
            console.log('ItemDetails:', itemDetails);
            
            if (!itemDetails || !itemDetails.fullName || !itemDetails.size) {
                return res.status(400).json({ 
                    message: 'Invalid item details provided' 
                });
            }
            
            const productName = `${itemDetails.fullName} ${itemDetails.size}`;
            
            // First try to find by transactionId
            let recordsToDelete = [];
            
            if (transactionId) {
                recordsToDelete = await History.find({
                    transactionId: transactionId,
                    product: productName
                });
                
                console.log(`Found ${recordsToDelete.length} records by transactionId for ${productName}`);
            }
            
            // If no records found by transactionId, fall back to finding by product and recent timestamp
            if (recordsToDelete.length === 0) {
                // Look for records from the last hour
                const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
                
                recordsToDelete = await History.find({
                    product: productName,
                    timestamp: { $gte: oneHourAgo },
                    $or: [
                        { operation: 'Przesunięto ze stanu' },
                        { operation: 'Przeniesiono w ramach stanu' },
                        { operation: 'Usunięto ze stanu' },
                        { operation: 'Dodano do stanu' },
                        { operation: 'Sprzedano' },
                        { operation: 'Przywrócono stan' }
                    ]
                }).limit(5); // Limit to 5 most recent records
                
                console.log(`Found ${recordsToDelete.length} recent records for ${productName}`);
            }
            
            if (recordsToDelete.length === 0) {
                return res.status(404).json({ 
                    message: 'No history records found for this item',
                    productName: productName,
                    transactionId: transactionId
                });
            }
            
            // Delete the found records
            const deleteResult = await History.deleteMany({
                _id: { $in: recordsToDelete.map(r => r._id) }
            });
            
            console.log(`Successfully deleted ${deleteResult.deletedCount} records for single item: ${productName}`);
            
            res.status(200).json({ 
                message: 'Single item history records deleted successfully',
                deletedCount: deleteResult.deletedCount,
                productName: productName,
                transactionId: transactionId,
                deletedRecords: recordsToDelete.map(r => ({
                    id: r._id,
                    operation: r.operation,
                    timestamp: r.timestamp
                }))
            });
            
        } catch (error) {
            console.error('Error deleting single item from history:', error);
            res.status(500).json({ 
                message: 'Error deleting single item from history',
                error: error.message 
            });
        }
    }
}

module.exports = new HistoryController();