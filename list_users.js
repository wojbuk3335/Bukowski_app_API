const mongoose = require('mongoose');
const User = require('./Bukowski_App_API/Bukowski_app_API/backend/api/app/db/models/user');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/bukowski_app', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function listUsers() {
    try {
        console.log('👥 Pobieranie listy użytkowników...\n');
        
        const users = await User.find({});
        
        console.log(`Znaleziono ${users.length} użytkowników:`);
        console.log('='.repeat(60));
        
        users.forEach((user, index) => {
            console.log(`${index + 1}. ${user.name || user.username}`);
            console.log(`   Username: ${user.username || 'Brak'}`);
            console.log(`   Symbol: ${user.symbol || 'Brak'}`);
            console.log(`   Location: ${user.location || 'Brak'}`);
            console.log(`   ID: ${user._id}`);
            console.log(`   Email: ${user.email || 'Brak'}`);
            console.log('   ---');
        });
        
        if (users.length > 0) {
            console.log('\n💡 Aby przetestować endpoint, użyj danych logowania jednego z użytkowników');
            console.log('   (musisz znać hasło lub je zresetować)');
        }
        
    } catch (error) {
        console.error('❌ Błąd podczas pobierania użytkowników:', error);
    } finally {
        mongoose.connection.close();
    }
}

listUsers();