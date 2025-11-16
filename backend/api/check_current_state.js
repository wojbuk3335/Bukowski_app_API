const mongoose = require('mongoose');
const State = require('./app/db/models/state');
const User = require('./app/db/models/user');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/bukowski_app', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function checkCurrentState() {
    try {
        console.log('🔍 Sprawdzam aktualny stan magazynowy...\n');
        
        // Sprawdźmy wszystkich użytkowników
        const users = await User.find({});
        console.log(`👥 Znaleziono ${users.length} użytkowników:`);
        users.forEach(user => {
            console.log(`  - ${user.name || user.username} (${user.symbol || user.location}) - ID: ${user._id}`);
        });
        
        console.log('\n📊 Sprawdzam stan dla każdego punktu sprzedaży:');
        
        for (const user of users) {
            const sellingPoint = user.symbol || user.location;
            
            // Wyszukaj produkty dla tego punktu sprzedaży
            const stateItems = await State.find({
                sellingPoint: user._id
            })
            .populate('fullName', 'fullName code')
            .populate('size', 'Roz_Opis')
            .populate('sellingPoint', 'symbol location name username');
            
            console.log(`\n📍 ${sellingPoint} (${user.name || user.username}): ${stateItems.length} produktów`);
            
            if (stateItems.length > 0) {
                console.log('   Przykładowe produkty:');
                stateItems.slice(0, 5).forEach(item => {
                    const productName = item.fullName ? item.fullName.fullName : 'Nieznany';
                    const sizeName = item.size ? item.size.Roz_Opis : 'Brak rozmiaru';
                    console.log(`   - ${productName} ${sizeName} (${item.barcode})`);
                });
                if (stateItems.length > 5) {
                    console.log(`   ... i ${stateItems.length - 5} więcej`);
                }
            }
        }
        
        // Sprawdźmy też wszystkie produkty bez filtrowania
        const totalStateItems = await State.find({})
            .populate('fullName', 'fullName code')
            .populate('size', 'Roz_Opis')
            .populate('sellingPoint', 'symbol location name username');
            
        console.log(`\n📦 Łącznie w bazie: ${totalStateItems.length} produktów na stanie`);
        
        if (totalStateItems.length === 0) {
            console.log('⚠️  UWAGA: Baza State jest pusta! Brak produktów na stanie.');
        }
        
    } catch (error) {
        console.error('❌ Błąd podczas sprawdzania stanu:', error);
    } finally {
        mongoose.connection.close();
    }
}

// Uruchom sprawdzenie
checkCurrentState();