const mongoose = require('mongoose');
require('dotenv').config({ path: './app/.env' });

// Import models
const Goods = require('./app/models/goods');
const Manufacturer = require('./app/models/manufacturer');

async function checkRBIds() {
    try {
        await mongoose.connect(process.env.DATABASE_URL);
        console.log('✅ Connected to MongoDB');

        // 1. Find R&B manufacturer
        console.log('\n🔍 Searching for R&B manufacturer...');
        const rbManufacturers = await Manufacturer.find({
            Prod_Opis: { $regex: /R&B/i }
        });
        
        console.log('Found R&B manufacturers:', rbManufacturers.map(m => ({
            id: m._id,
            name: m.Prod_Opis
        })));

        // 2. Find products with R&B in name
        console.log('\n🔍 Searching for products with "R&B" in name...');
        const rbProductsByName = await Goods.find({
            fullName: { $regex: /R&B/i }
        }).populate('manufacturer').limit(5);
        
        console.log('Products with R&B in name:', rbProductsByName.map(p => ({
            id: p._id,
            name: p.fullName,
            manufacturerId: p.manufacturer ? p.manufacturer._id : 'NO_MANUFACTURER',
            manufacturerName: p.manufacturer ? p.manufacturer.Prod_Opis : 'NO_MANUFACTURER',
            category: p.category,
            subcategory: p.subcategory ? p.subcategory.Kat_1_Opis_1 : 'NO_SUBCATEGORY'
        })));

        // 3. Check specific manufacturer ID we're using
        const specificId = '68eebc6478015550b96ae903';
        console.log(`\n🔍 Checking manufacturer with ID: ${specificId}`);
        const specificManufacturer = await Manufacturer.findById(specificId);
        console.log('Specific manufacturer:', specificManufacturer);

        // 4. Find products with this specific manufacturer ID
        console.log(`\n🔍 Products with manufacturer ID ${specificId}:`);
        const productsWithSpecificId = await Goods.find({
            manufacturer: specificId
        }).limit(5);
        
        console.log('Products with specific ID:', productsWithSpecificId.map(p => ({
            id: p._id,
            name: p.fullName,
            manufacturerId: p.manufacturer
        })));

        // 5. Find all vest subcategories
        console.log('\n🔍 All vest subcategories in database:');
        const vestProducts = await Goods.find({
            'subcategory.Kat_1_Opis_1': { $regex: /kamizelka/i }
        }).populate('manufacturer').limit(10);
        
        console.log('Vest products:', vestProducts.map(p => ({
            id: p._id,
            name: p.fullName,
            subcategory: p.subcategory ? p.subcategory.Kat_1_Opis_1 : 'NO_SUBCATEGORY',
            manufacturerId: p.manufacturer ? p.manufacturer._id : 'NO_MANUFACTURER',
            manufacturerName: p.manufacturer ? p.manufacturer.Prod_Opis : 'NO_MANUFACTURER'
        })));

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

checkRBIds();