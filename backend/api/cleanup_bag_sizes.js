const mongoose = require('mongoose');
const Size = require('./app/db/models/size.js');

mongoose.connect('mongodb://127.0.0.1:27017/api-database').then(async () => {
    console.log('Connected to MongoDB');
    
    // Usuń wszystkie rozmiary z kodem '00'
    const result = await Size.deleteMany({ Roz_Kod: '00' });
    console.log('Deleted sizes with code 00:', result.deletedCount);
    
    // Usuń wszystkie rozmiary z opisem 'TOREBKA' lub '-'
    const result2 = await Size.deleteMany({ Roz_Opis: { $in: ['TOREBKA', '-'] } });
    console.log('Deleted sizes with description TOREBKA or -:', result2.deletedCount);
    
    mongoose.disconnect();
    console.log('Disconnected from database');
}).catch(err => {
    console.error('Error:', err);
    process.exit(1);
});