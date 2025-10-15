const mongoose = require('mongoose');
const Goods = require('./app/db/models/goods');
const Belts = require('./app/models/belts');

mongoose.connect('mongodb://localhost:27017/bukowski_app').then(async () => {
    console.log('🔧 Starting data fix for belts products...');
    
    // Find all products with belts subcategory
    const beltProducts = await Goods.find({ subcategory: 'belts' });
    console.log(`Found ${beltProducts.length} belt products`);
    
    const belts = await Belts.find();
    console.log(`Found ${belts.length} belts in Belt table`);
    
    for (const product of beltProducts) {
        console.log(`\n📦 Processing product: ${product.fullName}`);
        console.log(`   Current remainingsubsubcategory: |${product.remainingsubsubcategory}|`);
        console.log(`   Current Rodzaj: ${product.Rodzaj}`);
        
        // Find matching belt
        const matchingBelt = belts.find(belt => 
            belt.Belt_Opis.trim() === product.remainingsubsubcategory.trim()
        );
        
        if (matchingBelt) {
            console.log(`   ✅ Found matching belt: |${matchingBelt.Belt_Opis}| with Rodzaj: ${matchingBelt.Rodzaj}`);
            
            if (product.Rodzaj !== matchingBelt.Rodzaj) {
                console.log(`   🔄 Updating Rodzaj from ${product.Rodzaj} to ${matchingBelt.Rodzaj}`);
                await Goods.updateOne(
                    { _id: product._id },
                    { 
                        Rodzaj: matchingBelt.Rodzaj,
                        remainingsubsubcategory: matchingBelt.Belt_Opis.trim() // Also fix spacing
                    }
                );
                console.log(`   ✅ Updated!`);
            } else {
                console.log(`   ✅ Rodzaj already correct`);
            }
        } else {
            console.log(`   ❌ No matching belt found for: |${product.remainingsubsubcategory}|`);
        }
    }
    
    console.log('\n🎉 Data fix completed!');
    process.exit();
}).catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
});