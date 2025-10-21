const mongoose = require('mongoose');
const User = require('./app/db/models/user');

mongoose.connect('mongodb://localhost:27017/bukowski_app').then(async () => {
    console.log('=== PUNKTY SPRZEDAŻY ===');
    const users = await User.find({ role: 'user' }).sort({ sellingPoint: 1 });
    
    users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.sellingPoint} - ${user.location} (ID: ${user._id})`);
    });
    
    console.log(`\nLiczba punktów: ${users.length}`);
    process.exit();
});