// Script to clean up existing "COFNIĘTE" entries from history
// This implements the clean history approach

const mongoose = require('mongoose');
const History = require('./backend/api/app/db/models/history');
const config = require('./backend/api/app/config');

async function cleanupHistory() {
    try {
        // Connect to database
        await mongoose.connect(config.database.url, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log('Connected to database');
        
        // Find all COFNIĘTE entries
        const cofnieteEntries = await History.find({
            operation: { $regex: 'COFNIĘTE' }
        });
        
        console.log(`Found ${cofnieteEntries.length} COFNIĘTE entries`);
        
        // Group by transactionId to see what we're cleaning
        const transactionGroups = {};
        cofnieteEntries.forEach(entry => {
            if (entry.transactionId) {
                if (!transactionGroups[entry.transactionId]) {
                    transactionGroups[entry.transactionId] = [];
                }
                transactionGroups[entry.transactionId].push(entry);
            }
        });
        
        console.log(`Found ${Object.keys(transactionGroups).length} transactions with COFNIĘTE entries`);
        
        // For each transaction, remove all entries (both original and COFNIĘTE)
        let totalRemoved = 0;
        for (const transactionId of Object.keys(transactionGroups)) {
            const allEntriesInTransaction = await History.find({ transactionId });
            console.log(`Transaction ${transactionId}: ${allEntriesInTransaction.length} total entries`);
            
            // Remove all entries for this transaction
            const result = await History.deleteMany({ transactionId });
            console.log(`Removed ${result.deletedCount} entries for transaction ${transactionId}`);
            totalRemoved += result.deletedCount;
        }
        
        // Also remove any UNDO_ entries
        const undoEntries = await History.find({
            transactionId: { $regex: '^UNDO_' }
        });
        
        if (undoEntries.length > 0) {
            const undoResult = await History.deleteMany({
                transactionId: { $regex: '^UNDO_' }
            });
            console.log(`Removed ${undoResult.deletedCount} UNDO_ entries`);
            totalRemoved += undoResult.deletedCount;
        }
        
        console.log(`\nCLEANUP COMPLETE:`);
        console.log(`Total entries removed: ${totalRemoved}`);
        
        // Show remaining history count
        const remainingCount = await History.countDocuments();
        console.log(`Remaining history entries: ${remainingCount}`);
        
        await mongoose.disconnect();
        console.log('Disconnected from database');
        
    } catch (error) {
        console.error('Error during cleanup:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    cleanupHistory();
}

module.exports = cleanupHistory;
