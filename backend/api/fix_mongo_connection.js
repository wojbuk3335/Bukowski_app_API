const mongoose = require('mongoose');

// The working connection string from our test
const connectionString = 'mongodb://server846283_bukowskiapp:Jezusmoimpanem30!@mongodb.server846283.nazwa.pl:4005/server846283_bukowskiapp';

console.log('🔧 Testing final MongoDB connection...');

mongoose.set('strictQuery', false); // Suppress the deprecation warning

mongoose.connect(connectionString, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
})
.then(() => {
    console.log('✅ MongoDB connection successful!');
    console.log('📋 Connection details:');
    console.log('- Database:', mongoose.connection.db.databaseName);
    console.log('- Host:', mongoose.connection.host);
    console.log('- Port:', mongoose.connection.port);
    console.log('- Ready state:', mongoose.connection.readyState);
    
    // Test finding a user
    const User = mongoose.model('User', new mongoose.Schema({
        email: String,
        password: String
    }));
    
    return User.findOne({ email: 'w.bukowski1985@gmail.com' });
})
.then(user => {
    if (user) {
        console.log('✅ User found in database!');
        console.log('- Email:', user.email);
        console.log('- Password hash exists:', !!user.password);
    } else {
        console.log('❌ User not found in database');
    }
    process.exit(0);
})
.catch(error => {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
});