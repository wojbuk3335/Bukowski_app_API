const mongoose = require('mongoose');
const Transfer = require('./app/db/models/transfer');

// Użyj config z aplikacji
const config = require('./app/config');

// Połączenie z bazą danych
mongoose.connect(config.database);

async function cleanupDuplicates() {
    try {
        console.log('🧹 Starting duplicate cleanup...');
        
        // Znajdź wszystkie transfery "Ada CZERWONY 2XL"
        const duplicates = await Transfer.find({
            fullName: "Ada CZERWONY",
            size: "2XL",
            productId: "0010702300001"
        }).sort({ createdAt: 1 }); // Sortuj po dacie utworzenia (najstarsze pierwsze)
        
        console.log(`Found ${duplicates.length} duplicates`);
        
        if (duplicates.length > 7) {
            // Zachowaj pierwsze 7 (najstarsze), usuń resztę
            const toKeep = duplicates.slice(0, 7);
            const toDelete = duplicates.slice(7);
            
            console.log(`Keeping ${toKeep.length} original transfers`);
            console.log(`Deleting ${toDelete.length} duplicate transfers`);
            
            // Usuń duplikaty
            const deleteIds = toDelete.map(transfer => transfer._id);
            const deleteResult = await Transfer.deleteMany({
                _id: { $in: deleteIds }
            });
            
            console.log(`✅ Deleted ${deleteResult.deletedCount} duplicate transfers`);
            
            // Wyświetl zachowane transfery
            console.log('\n🔄 Kept transfers:');
            toKeep.forEach((transfer, index) => {
                console.log(`${index + 1}. ID: ${transfer._id}, Created: ${transfer.createdAt}, From: ${transfer.transfer_from}, To: ${transfer.transfer_to}`);
            });
        } else {
            console.log('✅ No cleanup needed, found only', duplicates.length, 'transfers');
        }
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    } finally {
        mongoose.connection.close();
        console.log('🔌 Database connection closed');
    }
}

cleanupDuplicates();
