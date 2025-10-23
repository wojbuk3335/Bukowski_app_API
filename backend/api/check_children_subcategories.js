const mongoose = require('mongoose');
const config = require('./app/config');

async function checkSubcategories() {
    try {
        console.log('🔍 Sprawdzam podkategorie dziecięce...');
        
        await mongoose.connect(config.database);
        console.log('✅ Połączono z bazą danych');
        
        // Sprawdź w kolekcji subcategories
        const SubcategoryModel = mongoose.model('subcategories', new mongoose.Schema({
            Kat_1_ID: String,
            Kat_1_Opis_1: String
        }));
        
        const childrenSubcategories = await SubcategoryModel.find({
            Kat_1_Opis_1: { $in: ['Kożuch dziecięcy', 'Kamizelka dziecięca'] }
        });
        
        console.log(`📊 Znaleziono ${childrenSubcategories.length} podkategorii dziecięcych w 'subcategories':`);
        childrenSubcategories.forEach(s => {
            console.log(`- ${s._id} - ${s.Kat_1_Opis_1}`);
        });
        
        // Sprawdź w kolekcji subcategorycoats  
        const SubcategoryCoats = require('./app/db/models/subcategoryCoats');
        
        const childrenSubcategoriesCoats = await SubcategoryCoats.find({
            Kat_1_Opis_1: { $in: ['Kożuch dziecięcy', 'Kamizelka dziecięca'] }
        });
        
        console.log(`📊 Znaleziono ${childrenSubcategoriesCoats.length} podkategorii dziecięcych w 'subcategorycoats':`);
        childrenSubcategoriesCoats.forEach(s => {
            console.log(`- ${s._id} - ${s.Kat_1_Opis_1}`);
        });
        
        await mongoose.disconnect();
        console.log('🔌 Rozłączono z bazą danych');
        
    } catch (error) {
        console.error('💥 Błąd:', error.message);
        await mongoose.disconnect();
    }
}

checkSubcategories();