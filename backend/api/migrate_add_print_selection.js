const mongoose = require('mongoose');
const config = require('./app/config');

// Import the Goods model
const Goods = require('./app/db/models/goods');

async function migrateAddPrintSelection() {
    try {
        // Connect to MongoDB
        await mongoose.connect(config.mongodbUrl, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connected to MongoDB');

        // Find all goods that don't have isSelectedForPrint field
        const goodsWithoutField = await Goods.find({ 
            isSelectedForPrint: { $exists: false } 
        });

        console.log(`📊 Found ${goodsWithoutField.length} products without isSelectedForPrint field`);

        if (goodsWithoutField.length > 0) {
            // Update all goods to have isSelectedForPrint: false by default
            const result = await Goods.updateMany(
                { isSelectedForPrint: { $exists: false } },
                { $set: { isSelectedForPrint: false } }
            );

            console.log(`✅ Successfully updated ${result.modifiedCount} products with isSelectedForPrint: false`);
        } else {
            console.log('✅ All products already have isSelectedForPrint field');
        }

        // Verify the migration
        const totalGoods = await Goods.countDocuments();
        const goodsWithField = await Goods.countDocuments({ 
            isSelectedForPrint: { $exists: true } 
        });

        console.log(`📊 Migration verification:`);
        console.log(`   Total products: ${totalGoods}`);
        console.log(`   Products with isSelectedForPrint: ${goodsWithField}`);
        
        if (totalGoods === goodsWithField) {
            console.log('✅ Migration completed successfully!');
        } else {
            console.log('❌ Migration incomplete - some products still missing the field');
        }

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        // Close the connection
        await mongoose.connection.close();
        console.log('📦 Database connection closed');
    }
}

// Run the migration
migrateAddPrintSelection();