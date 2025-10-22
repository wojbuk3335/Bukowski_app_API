const mongoose = require('mongoose');
const config = require('./app/config');

// Import the Goods model
const Goods = require('./app/db/models/goods');

async function migrateAddRowBackgroundColor() {
    try {
        // Connect to MongoDB
        await mongoose.connect(config.mongodbUrl, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connected to MongoDB');

        // Find all goods that don't have rowBackgroundColor field
        const goodsWithoutField = await Goods.find({ 
            rowBackgroundColor: { $exists: false } 
        });

        console.log(`📊 Found ${goodsWithoutField.length} products without rowBackgroundColor field`);

        if (goodsWithoutField.length > 0) {
            // Update all goods to have rowBackgroundColor: '#ffffff' by default
            const result = await Goods.updateMany(
                { rowBackgroundColor: { $exists: false } },
                { $set: { rowBackgroundColor: '#ffffff' } }
            );

            console.log(`✅ Successfully updated ${result.modifiedCount} products with rowBackgroundColor: '#ffffff'`);
        } else {
            console.log('✅ All products already have rowBackgroundColor field');
        }

        // Verify the migration
        const totalGoods = await Goods.countDocuments();
        const goodsWithField = await Goods.countDocuments({ 
            rowBackgroundColor: { $exists: true } 
        });

        console.log(`📊 Migration verification:`);
        console.log(`   Total products: ${totalGoods}`);
        console.log(`   Products with rowBackgroundColor: ${goodsWithField}`);
        
        if (totalGoods === goodsWithField) {
            console.log('✅ Migration completed successfully!');
            console.log('🎨 All products now have white background color (#ffffff) by default');
        } else {
            console.log('❌ Migration incomplete - some products still missing the field');
        }

        // Show some sample products to verify
        const sampleProducts = await Goods.find({}, 'fullName rowBackgroundColor').limit(3);
        console.log('\n📋 Sample products after migration:');
        sampleProducts.forEach(product => {
            console.log(`   ${product.fullName}: ${product.rowBackgroundColor}`);
        });

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        // Close the connection
        await mongoose.connection.close();
        console.log('\n📦 Database connection closed');
        console.log('🚀 Migration script finished');
    }
}

// Run the migration
console.log('🔄 Starting rowBackgroundColor field migration...');
migrateAddRowBackgroundColor();