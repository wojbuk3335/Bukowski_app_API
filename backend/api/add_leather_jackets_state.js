const mongoose = require('mongoose');
const State = require('./app/db/models/state');
const Goods = require('./app/db/models/goods');
const Size = require('./app/db/models/size');
const User = require('./app/db/models/user');

// Użyj lokalnego connection stringa (zmień na produkcyjny jeśli potrzebujesz)
mongoose.connect('mongodb://localhost:27017/bukowski_app').then(async () => {
    console.log('🔗 Połączono z bazą danych');
    
    try {
        // Najpierw sprawdź jakie kurtki skórzane mamy w bazie
        const leatherJackets = await Goods.find({
            nazwa: { $regex: /kurtka|skórzana/i }
        }).limit(10); // Weź pierwsze 10 kurtek
        
        console.log(`\n📦 Znaleziono ${leatherJackets.length} kurtek skórzanych`);
        
        if (leatherJackets.length === 0) {
            console.log('❌ Brak kurtek skórzanych w bazie danych');
            process.exit();
        }
        
        // Sprawdź dostępne rozmiary
        const sizes = await Size.find({});
        console.log(`📏 Dostępne rozmiary: ${sizes.length}`);
        
        // Przykładowe punkty sprzedaży w Zakopanem (ID będą pobrane z bazy lub utworzone)
        const sellingPointsData = [
            { name: 'Taty', location: 'Zakopane - Centrum' },
            { name: 'Pod Most', location: 'Zakopane - Most' },
            { name: 'Rynek', location: 'Zakopane - Rynek' },
            { name: 'Krupówki', location: 'Zakopane - Krupówki' },
            { name: 'Gubałówka', location: 'Zakopane - Gubałówka' }
        ];
        
        // Pobierz lub utwórz punkty sprzedaży
        const sellingPoints = [];
        for (const pointData of sellingPointsData) {
            let user = await User.findOne({ sellingPoint: pointData.name });
            
            if (!user) {
                console.log(`➕ Tworzę nowy punkt sprzedaży: ${pointData.name}`);
                user = new User({
                    _id: new mongoose.Types.ObjectId(),
                    email: `${pointData.name.toLowerCase().replace(/\s+/g, '')}@bukowski.pl`,
                    password: 'defaultpassword123', // W rzeczywistości użyj hasła zahashowanego
                    symbol: pointData.name.toUpperCase(),
                    sellingPoint: pointData.name,
                    location: pointData.location,
                    role: 'user'
                });
                await user.save();
            }
            sellingPoints.push(user);
        }
        
        console.log(`\n🏪 Przygotowano ${sellingPoints.length} punktów sprzedaży`);
        
        // Generuj stany magazynowe
        const stateEntries = [];
        let totalItems = 0;
        
        for (const jacket of leatherJackets) {
            // Dla każdej kurtki, dodaj różne rozmiary do różnych punktów
            const availableSizes = sizes.slice(0, 8); // Użyj pierwszych 8 rozmiarów
            
            for (let i = 0; i < availableSizes.length; i++) {
                const size = availableSizes[i];
                const sellingPoint = sellingPoints[i % sellingPoints.length]; // Rotuj między punktami
                
                // Dodaj 2-5 sztuk każdego rozmiaru
                const quantity = Math.floor(Math.random() * 4) + 2;
                
                for (let q = 0; q < quantity; q++) {
                    const barcode = `${jacket.kod}-${size.name}-${String(Date.now() + Math.random()).slice(-6)}`;
                    
                    const stateEntry = {
                        _id: new mongoose.Types.ObjectId(),
                        fullName: jacket._id,
                        date: new Date(),
                        barcode: barcode,
                        size: size._id,
                        sellingPoint: sellingPoint._id,
                        price: jacket.cena_sprzedazy || 299.99,
                        discount_price: jacket.cena_promocyjna || null
                    };
                    
                    stateEntries.push(stateEntry);
                    totalItems++;
                }
            }
        }
        
        console.log(`\n📊 Przygotowano ${stateEntries.length} wpisów stanu magazynowego`);
        
        // Zapisz do bazy danych w partiach
        const batchSize = 50;
        let inserted = 0;
        
        for (let i = 0; i < stateEntries.length; i += batchSize) {
            const batch = stateEntries.slice(i, i + batchSize);
            await State.insertMany(batch);
            inserted += batch.length;
            console.log(`✅ Dodano ${inserted}/${stateEntries.length} wpisów`);
        }
        
        // Podsumowanie
        console.log(`\n🎉 UKOŃCZONO!`);
        console.log(`📦 Dodano stan dla ${leatherJackets.length} różnych kurtek skórzanych`);
        console.log(`🏪 Rozdzielono między ${sellingPoints.length} punktów sprzedaży:`);
        
        for (const point of sellingPoints) {
            const count = stateEntries.filter(entry => 
                entry.sellingPoint.toString() === point._id.toString()
            ).length;
            console.log(`   • ${point.sellingPoint} (${point.location}): ${count} sztuk`);
        }
        
        console.log(`📊 Łączna liczba sztuk w stanie: ${totalItems}`);
        
    } catch (error) {
        console.error('❌ Błąd:', error.message);
    }
    
    process.exit();
}).catch(error => {
    console.error('❌ Błąd połączenia z bazą danych:', error.message);
    process.exit(1);
});