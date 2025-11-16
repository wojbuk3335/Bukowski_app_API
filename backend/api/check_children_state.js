const mongoose = require('mongoose');
const config = require('./app/config');

async function checkChildrenState() {
    try {
        console.log('🔍 Sprawdzam stan magazynowy kamizelek dziecięcych...');
        
        await mongoose.connect(config.database);
        console.log('✅ Połączono z bazą danych');
        
        // Sprawdź produkty dziecięce w bazie goods
        const Goods = require('./app/db/models/goods');
        const childrenProducts = await Goods.find({
            fullName: { $regex: /kamizelka dziecięca/i }
        });
        
        console.log(`📦 Znaleziono ${childrenProducts.length} kamizelek dziecięcych w bazie goods:`);
        childrenProducts.forEach(p => {
            console.log(`- ${p.fullName} (${p.code})`);
        });
        
        // Sprawdź stan magazynowy
        const StateModel = mongoose.model('states', new mongoose.Schema({
            fullName: String,
            size: String,
            sellingPoint: String,
            symbol: String,
            quantity: Number
        }));
        
        const childrenState = await StateModel.find({
            fullName: { $regex: /kamizelka dziecięca/i }
        });
        
        console.log(`📊 Znaleziono ${childrenState.length} wpisów stanu magazynowego dla kamizelek dziecięcych:`);
        childrenState.forEach(s => {
            console.log(`- ${s.fullName} rozmiar ${s.size} - ilość: ${s.quantity}`);
        });
        
        // Sprawdź konkretnie rozmiar 116
        const size116State = await StateModel.find({
            fullName: { $regex: /kamizelka dziecięca/i },
            size: '116'
        });
        
        console.log(`🎯 Kamizelki dziecięce rozmiar 116 w stanie magazynowym: ${size116State.length}`);
        size116State.forEach(s => {
            console.log(`- ${s.fullName} rozmiar ${s.size} - ilość: ${s.quantity} - punkt: ${s.sellingPoint}`);
        });
        
        await mongoose.disconnect();
        console.log('🔌 Rozłączono z bazą danych');
        
    } catch (error) {
        console.error('💥 Błąd:', error.message);
        await mongoose.disconnect();
    }
}

checkChildrenState();