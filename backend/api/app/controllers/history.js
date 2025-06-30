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
            
            console.log('=== DELETE SINGLE ITEM DEBUG ===');
            console.log('TransactionId:', transactionId);
            console.log('ItemDetails:', JSON.stringify(itemDetails, null, 2));
            
            if (!itemDetails || !itemDetails.fullName || !itemDetails.size) {
                return res.status(400).json({ 
                    message: 'Invalid item details provided' 
                });
            }
            
            const productName = `${itemDetails.fullName} ${itemDetails.size}`;
            const barcode = itemDetails.barcode;
            const processType = itemDetails.processType;
            
            console.log('Product name to search:', productName);
            console.log('Barcode:', barcode);
            console.log('Process type:', processType);
            
            // First, let's see what records exist for this product
            const allRecordsForProduct = await History.find({ product: productName }).sort({ timestamp: -1 });
            console.log(`Found ${allRecordsForProduct.length} total records for product "${productName}"`);
            
            if (allRecordsForProduct.length > 0) {
                console.log('Existing records for this product:');
                allRecordsForProduct.forEach((record, index) => {
                    console.log(`  ${index + 1}. ID: ${record._id}, Operation: ${record.operation}, TransactionId: ${record.transactionId || 'N/A'}, Timestamp: ${record.timestamp}, Details: ${record.details || 'N/A'}`);
                });
            }
            
            // Strategy 1: Try to find by transactionId and product (most specific)
            let recordToDelete = null;
            
            if (transactionId) {
                console.log('Strategy 1: Searching by transactionId and product...');
                recordToDelete = await History.findOne({
                    product: productName,
                    transactionId: transactionId
                }).sort({ timestamp: -1 });
                
                if (recordToDelete) {
                    console.log('✓ Found record using Strategy 1 (transactionId + product)');
                } else {
                    console.log('✗ No record found with Strategy 1');
                }
            }
            
            // Strategy 2: If barcode exists, try to find by product and barcode in details
            if (!recordToDelete && barcode) {
                console.log('Strategy 2: Searching by product and barcode in details...');
                recordToDelete = await History.findOne({
                    product: productName,
                    details: { $regex: barcode, $options: 'i' }
                }).sort({ timestamp: -1 });
                
                if (recordToDelete) {
                    console.log('✓ Found record using Strategy 2 (product + barcode)');
                } else {
                    console.log('✗ No record found with Strategy 2');
                }
            }
            
            // Strategy 3: Recent record by product and operation type
            if (!recordToDelete && processType) {
                console.log('Strategy 3: Searching by product and operation type...');
                
                let operations = [];
                switch (processType) {
                    case 'sold':
                        operations = ['Sprzedano', 'Usunięto ze stanu'];
                        break;
                    case 'synchronized':
                        operations = ['Przeniesiono w ramach stanu', 'Przesunięto ze stanu'];
                        break;
                    case 'transferred':
                        operations = ['Przesunięto ze stanu', 'Dodano do stanu'];
                        break;
                }
                
                if (operations.length > 0) {
                    recordToDelete = await History.findOne({
                        product: productName,
                        operation: { $in: operations },
                        timestamp: { $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) } // Last 2 hours
                    }).sort({ timestamp: -1 });
                    
                    if (recordToDelete) {
                        console.log('✓ Found record using Strategy 3 (product + operation + recent)');
                    } else {
                        console.log('✗ No record found with Strategy 3');
                    }
                }
            }
            
            // Strategy 4: Most recent record for this product (last resort)
            if (!recordToDelete) {
                console.log('Strategy 4: Getting most recent record for this product...');
                recordToDelete = await History.findOne({
                    product: productName,
                    timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
                }).sort({ timestamp: -1 });
                
                if (recordToDelete) {
                    console.log('✓ Found record using Strategy 4 (most recent)');
                } else {
                    console.log('✗ No record found with Strategy 4');
                }
            }
            
            if (!recordToDelete) {
                console.log('❌ NO RECORD FOUND WITH ANY STRATEGY');
                return res.status(404).json({ 
                    message: 'No history record found for this item',
                    productName: productName,
                    transactionId: transactionId,
                    availableRecords: allRecordsForProduct.length,
                    searchDetails: {
                        barcode: barcode,
                        processType: processType
                    }
                });
            }
            
            console.log(`✅ Found specific record to delete:`, {
                id: recordToDelete._id,
                operation: recordToDelete.operation,
                product: recordToDelete.product,
                timestamp: recordToDelete.timestamp,
                transactionId: recordToDelete.transactionId,
                details: recordToDelete.details
            });
            
            // Delete ONLY this ONE specific record
            const deleteResult = await History.deleteOne({ _id: recordToDelete._id });
            
            console.log(`✅ Successfully deleted 1 specific record for: ${productName}`);
            console.log('Delete result:', deleteResult);
            
            res.status(200).json({ 
                message: 'Single item history record deleted successfully',
                deletedCount: deleteResult.deletedCount,
                productName: productName,
                transactionId: transactionId,
                deletedRecord: {
                    id: recordToDelete._id,
                    operation: recordToDelete.operation,
                    timestamp: recordToDelete.timestamp,
                    details: recordToDelete.details
                }
            });
            
        } catch (error) {
            console.error('❌ Error deleting single item from history:', error);
            res.status(500).json({ 
                message: 'Error deleting single item from history',
                error: error.message 
            });
        }
    }
}

module.exports = new HistoryController();