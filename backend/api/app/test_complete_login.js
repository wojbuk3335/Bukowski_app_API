const mongoose = require('mongoose');
const argon2 = require('argon2');

// Import konfiguracji (tak jak w prawdziwej aplikacji)
const config = require('./config');

console.log('🔧 Test kompletnego systemu logowania...');
console.log('📋 Konfiguracja:');
console.log('- DATABASE:', config.database.substring(0, 50) + '...');
console.log('- PORT:', config.port);
console.log('- DOMAIN:', config.domain);

// Model użytkownika (uproszczony)
const userSchema = new mongoose.Schema({
    email: { type: String, required: true },
    password: { type: String, required: true },
    firstName: String,
    lastName: String
});

const User = mongoose.model('User', userSchema);

async function testCompleteLogin() {
    try {
        // 1. Połączenie z bazą danych
        console.log('\n1️⃣ Łączenie z MongoDB...');
        mongoose.set('strictQuery', false);
        
        await mongoose.connect(config.database, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });
        
        console.log('✅ Połączenie z MongoDB udane!');
        
        // 2. Znajdowanie użytkownika
        console.log('\n2️⃣ Szukanie użytkownika...');
        const user = await User.findOne({ email: 'w.bukowski1985@gmail.com' });
        
        if (!user) {
            console.log('❌ Użytkownik nie znaleziony!');
            process.exit(1);
        }
        
        console.log('✅ Użytkownik znaleziony!');
        console.log('- Email:', user.email);
        console.log('- Imię:', user.firstName);
        console.log('- Hash hasła:', user.password.substring(0, 20) + '...');
        
        // 3. Weryfikacja hasła
        console.log('\n3️⃣ Weryfikacja hasła...');
        const passwordToTest = 'Jezusmoimpanem30!';
        
        const isPasswordValid = await argon2.verify(user.password, passwordToTest);
        
        if (isPasswordValid) {
            console.log('✅ Hasło jest poprawne!');
            console.log('🎉 SUKCES! Cały system logowania działa prawidłowo!');
        } else {
            console.log('❌ Hasło niepoprawne!');
        }
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Błąd:', error.message);
        process.exit(1);
    }
}

testCompleteLogin();