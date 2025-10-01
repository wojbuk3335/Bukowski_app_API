const mongoose = require('mongoose');
const Goods = require('./app/db/models/goods.js');
const Size = require('./app/db/models/size.js');

mongoose.connect('mongodb://127.0.0.1:27017/api-database').then(async () => {
    console.log('Connected to MongoDB');
    
    // Sprawdź czy mamy produkty typu Torebki
    const bags = await Goods.find({ category: 'Torebki' }).select('code barcode name category').limit(3);
    console.log('\n=== PRODUKTY TYPU TOREBKI ===');
    bags.forEach(bag => {
        console.log(`ID: ${bag._id}`);
        console.log(`Name: ${bag.name}`);
        console.log(`Code: ${bag.code}`);
        console.log(`Barcode: ${bag.barcode}`);
        console.log(`Category: ${bag.category}`);
        console.log('---');
    });
    
    // Sprawdź czy mamy rozmiar TOREBKA
    const torebkaSize = await Size.findOne({ Roz_Opis: 'TOREBKA' });
    console.log('\n=== ROZMIAR TOREBKA ===');
    if (torebkaSize) {
        console.log(`ID: ${torebkaSize._id}`);
        console.log(`Opis: ${torebkaSize.Roz_Opis}`);
        console.log(`Kod: ${torebkaSize.Roz_Kod}`);
    } else {
        console.log('Rozmiar TOREBKA nie istnieje - zostanie utworzony automatycznie');
    }
    
    mongoose.disconnect();
    console.log('\nRozłączono z bazą danych');
}).catch(err => {
    console.error('Błąd połączenia:', err);
    process.exit(1);
});