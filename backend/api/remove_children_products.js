const mongoose = require('mongoose');
const config = require('./app/config');

async function removeChildrenProducts() {
    try {
        console.log('🗑️ Rozpoczynam usuwanie produktów dziecięcych...');
        
        await mongoose.connect(config.database);
        console.log('✅ Połączono z bazą danych');
        
        const Goods = require('./app/db/models/goods');
        
        // Znajdź produkty dziecięce po kodach
        const childrenProducts = await Goods.find({
            code: { $regex: /^(453080000|453090000)/ }
        });
        
        console.log(`📊 Znaleziono ${childrenProducts.length} produktów dziecięcych:`);
        childrenProducts.forEach(p => {
            console.log(`- ${p.code} - ${p.fullName} - subcategory: ${p.subcategory}`);
        });
        
        // Usuń produkty dziecięce
        const deleteResult = await Goods.deleteMany({
            code: { $regex: /^(453080000|453090000)/ }
        });
        
        console.log(`🗑️ Usunięto ${deleteResult.deletedCount} produktów dziecięcych`);
        
        await mongoose.disconnect();
        console.log('🔌 Rozłączono z bazą danych');
        console.log('✅ GOTOWE! Produkty dziecięce zostały usunięte.');
        
    } catch (error) {
        console.error('💥 Błąd podczas usuwania produktów dziecięcych:', error.message);
        await mongoose.disconnect();
    }
}

removeChildrenProducts();