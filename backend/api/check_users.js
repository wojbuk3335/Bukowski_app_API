const mongoose = require('mongoose');
const User = require('./app/db/models/user');

mongoose.connect('mongodb+srv://wbukowski1985:3VX4byVnTO2CFRPc@bukowskiapp.emdzg.mongodb.net/BukowskiApp?retryWrites=true&w=majority&appName=BukowskiApp').then(async () => {
    console.log('🔗 Połączono z bazą danych MongoDB Atlas');

    try {
        // Sprawdź wszystkie funkcje użytkowników
        const allUsers = await User.find({}).lean();
        console.log(`👥 Znaleziono ${allUsers.length} użytkowników w bazie danych`);

        // Pogrupuj według funkcji
        const functionsCount = {};
        allUsers.forEach(user => {
            const func = user.funkcja || 'BRAK';
            functionsCount[func] = (functionsCount[func] || 0) + 1;
        });

        console.log(`\n📊 FUNKCJE UŻYTKOWNIKÓW:`);
        Object.entries(functionsCount).forEach(([func, count]) => {
            console.log(`   ${func}: ${count} użytkowników`);
        });

        // Pokaż szczegóły użytkowników z różnymi funkcjami
        console.log(`\n👤 SZCZEGÓŁY UŻYTKOWNIKÓW:`);
        const uniqueFunctions = [...new Set(allUsers.map(u => u.funkcja))];
        for (const func of uniqueFunctions) {
            console.log(`\n--- ${func} ---`);
            const usersWithFunc = allUsers.filter(u => u.funkcja === func);
            usersWithFunc.forEach((user, i) => {
                console.log(`   ${i + 1}. ID: ${user._id}, Login: ${user.login || 'BRAK'}, Funkcja: ${user.funkcja}`);
            });
        }

    } catch (error) {
        console.error('❌ Błąd:', error.message);
    }

    mongoose.connection.close();
    console.log('\n🔌 Rozłączono z bazą danych');

}).catch(error => {
    console.error('❌ Błąd połączenia z bazą danych:', error.message);
    process.exit(1);
});