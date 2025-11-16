const mongoose = require('mongoose');
const Goods = require('./app/db/models/goods');

// Database connection string - use the same as in config
const config = require('./app/config');
const DB_URI = config.database;

async function initializePrintSelection() {
    try {
        // Connect to database
        await mongoose.connect(DB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connected to MongoDB');

        // Update all existing products to add isSelectedForPrint field (default: false)
        const result = await Goods.updateMany(
            { isSelectedForPrint: { $exists: false } }, // Only products without this field
            { $set: { isSelectedForPrint: false } }     // Set default to false
        );

        console.log(`✅ Updated ${result.modifiedCount} products with isSelectedForPrint field`);

        // Get summary of products
        const totalProducts = await Goods.countDocuments({});
        const selectedProducts = await Goods.countDocuments({ isSelectedForPrint: true });
        
        console.log(`📊 Summary:`);
        console.log(`   Total products: ${totalProducts}`);
        console.log(`   Selected for print: ${selectedProducts}`);
        console.log(`   Not selected: ${totalProducts - selectedProducts}`);

    } catch (error) {
        console.error('❌ Error initializing print selection:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run the initialization
initializePrintSelection();