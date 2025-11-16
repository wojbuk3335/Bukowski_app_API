const mongoose = require('mongoose');
const History = require('./app/db/models/history');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/Bukowski_app', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function migrateHistoryData() {
    try {
        console.log('🔄 Starting History data migration...');
        
        // Find all History entries that don't have a size field or have empty size
        const historyEntries = await History.find({
            $or: [
                { size: { $exists: false } },
                { size: '' },
                { size: null }
            ]
        });
        
        console.log(`📋 Found ${historyEntries.length} entries to migrate`);
        
        let updatedCount = 0;
        
        for (const entry of historyEntries) {
            const originalProduct = entry.product;
            
            // Skip if product is empty or just '-'
            if (!originalProduct || originalProduct === '-' || originalProduct === 'Nieznany produkt') {
                continue;
            }
            
            // Try to extract size from the end of product name
            // Common patterns: "Nazwa S", "Nazwa M", "Nazwa L", "Nazwa XL", "Nazwa XXL", "Nazwa 2XL", etc.
            const sizePattern = /\s+(XS|S|M|L|XL|XXL|XXXL|2XL|3XL|4XL|5XL|\d+XL)$/i;
            const match = originalProduct.match(sizePattern);
            
            if (match) {
                const size = match[1].toUpperCase();
                const productNameOnly = originalProduct.replace(sizePattern, '').trim();
                
                // Update the entry
                await History.findByIdAndUpdate(entry._id, {
                    product: productNameOnly,
                    size: size
                });
                
                console.log(`✅ Updated: "${originalProduct}" → Product: "${productNameOnly}", Size: "${size}"`);
                updatedCount++;
            } else {
                // If no size pattern found, set size to '-'
                await History.findByIdAndUpdate(entry._id, {
                    size: '-'
                });
                
                console.log(`➡️  No size found: "${originalProduct}" → Size: "-"`);
                updatedCount++;
            }
        }
        
        console.log(`✅ Migration completed! Updated ${updatedCount} entries.`);
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        mongoose.connection.close();
    }
}

// Run migration
migrateHistoryData();