const mongoose = require('mongoose');
const config = require('./app/config');

async function checkProductMatching() {
    try {
        console.log('🔍 Sprawdzam dopasowanie nazw produktów...');
        
        await mongoose.connect(config.database);
        console.log('✅ Połączono z bazą danych');
        
        // Sprawdź produkty w goods
        const Goods = require('./app/db/models/goods');
        const childrenVests = await Goods.find({
            fullName: { $regex: /kamizelka dziecięca/i }
        }).select('fullName');
        
        console.log('📦 Nazwy kamizelek dziecięcych w GOODS:');
        childrenVests.forEach(p => {
            console.log(`"${p.fullName}"`);
        });
        
        // Sprawdź stany
        const StateModel = mongoose.model('states', new mongoose.Schema({
            fullName: String,
            size: String,
            sellingPoint: String,
            quantity: Number
        }));
        
        const childrenStates = await StateModel.find({
            fullName: { $regex: /kamizelka dziecięca/i },
            size: '116',
            quantity: 1
        }).distinct('fullName');
        
        console.log('\n📊 Nazwy kamizelek dziecięcych w STATES (rozmiar 116, ilość 1):');
        childrenStates.forEach(name => {
            console.log(`"${name}"`);
        });
        
        // Sprawdź czy nazwy są identyczne
        console.log('\n🔍 PORÓWNANIE NAZW:');
        const goodsNames = childrenVests.map(p => p.fullName);
        
        goodsNames.forEach(goodsName => {
            const hasState = childrenStates.includes(goodsName);
            console.log(`${hasState ? '✅' : '❌'} "${goodsName}" - ${hasState ? 'MA' : 'BRAK'} stanu magazynowego`);
        });
        
        await mongoose.disconnect();
        console.log('\n🔌 Rozłączono z bazą danych');
        
    } catch (error) {
        console.error('💥 Błąd:', error.message);
        await mongoose.disconnect();
    }
}

checkProductMatching();