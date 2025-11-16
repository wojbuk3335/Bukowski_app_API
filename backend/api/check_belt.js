const mongoose = require('mongoose');
const Belts = require('./app/models/belts');

mongoose.connect('mongodb://localhost:27017/bukowski_app').then(async () => {
    console.log('=== PASKI W BAZIE ===');
    const belts = await Belts.find();
    
    belts.forEach((belt, index) => {
        console.log(`${index + 1}. ID: ${belt._id}`);
        console.log(`   Kod: ${belt.Belt_Kod}`);
        console.log(`   Opis: |${belt.Belt_Opis}|`);
        console.log(`   Rodzaj: ${belt.Rodzaj}`);
        console.log('');
    });
    
    process.exit();
});