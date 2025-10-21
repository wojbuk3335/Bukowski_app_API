const mongoose = require('mongoose');
const State = require('./app/db/models/state');
const Goods = require('./app/db/models/goods');
const Size = require('./app/db/models/size');
const User = require('./app/db/models/user');

// Użyj tego samego connection stringu co w import_leather_jackets.js
mongoose.connect('mongodb+srv://wbukowski1985:3VX4byVnTO2CFRPc@bukowskiapp.emdzg.mongodb.net/BukowskiApp?retryWrites=true&w=majority&appName=BukowskiApp').then(async () => {
    console.log('🔗 Połączono z bazą danych MongoDB Atlas');
    
    try {
        // 1. Znajdź wszystkie kurtki skórzane damskie (dodane wcześniej)
        const leatherJackets = await Goods.find({
            nazwa: { $regex: /adela|beatrice|diana|elena|felicia|aisha|ada/i }
        });
        
        console.log(`\n📦 Znaleziono ${leatherJackets.length} kurtek skórzanych damskich`);
        
        if (leatherJackets.length === 0) {
            console.log('❌ Brak kurtek skórzanych damskich. Uruchom najpierw import_leather_jackets.js');
            process.exit();
        }
        
        // 2. Znajdź rozmiary damskie
        const sizes = await Size.find({});
        console.log(`📏 Dostępne rozmiary: ${sizes.length} (${sizes.map(s => s.name).join(', ')})`);
        
        // 3. Znajdź istniejące punkty sprzedaży lub utwórz przykładowe
        let sellingPoints = await User.find({ role: 'user' }).limit(5);
        
        if (sellingPoints.length === 0) {
            console.log('➕ Tworzę przykładowe punkty sprzedaży w Zakopanem...');
            
            const pointsData = [
                { name: 'Taty', location: 'Zakopane - Centrum', symbol: 'TATY' },
                { name: 'Pod Most', location: 'Zakopane - Most', symbol: 'PODMOST' },
                { name: 'Rynek', location: 'Zakopane - Rynek', symbol: 'RYNEK' },
                { name: 'Krupówki', location: 'Zakopane - Krupówki', symbol: 'KRUPOWKI' },
                { name: 'Gubałówka', location: 'Zakopane - Gubałówka', symbol: 'GUBALOWKA' }
            ];
            
            for (const pointData of pointsData) {
                const user = new User({
                    _id: new mongoose.Types.ObjectId(),
                    email: `${pointData.symbol.toLowerCase()}@bukowski.pl`,
                    password: '$2a$10$defaultpasswordhashjustforexample123456', // Zahashowane hasło
                    symbol: pointData.symbol,
                    sellingPoint: pointData.name,
                    location: pointData.location,
                    role: 'user'
                });
                
                try {
                    await user.save();
                    sellingPoints.push(user);
                    console.log(`✅ Utworzono punkt: ${pointData.name}`);
                } catch (err) {
                    if (err.code === 11000) {
                        console.log(`⚠️ Punkt ${pointData.name} już istnieje`);
                        const existingUser = await User.findOne({ sellingPoint: pointData.name });
                        if (existingUser) sellingPoints.push(existingUser);
                    } else {
                        console.error(`❌ Błąd tworzenia punktu ${pointData.name}:`, err.message);
                    }
                }
            }
        }
        
        console.log(`\n🏪 Punkty sprzedaży: ${sellingPoints.length}`);
        sellingPoints.forEach((point, i) => {
            console.log(`   ${i + 1}. ${point.sellingPoint} - ${point.location || 'Lokalizacja nieznana'}`);
        });
        
        // 4. Generuj stan magazynowy
        console.log('\n🎯 Generowanie stanu magazynowego...');
        
        const stateEntries = [];
        let totalItems = 0;
        
        // Dla każdej kurtki, rozdziel rozmiary między punkty
        for (let jacketIndex = 0; jacketIndex < leatherJackets.length; jacketIndex++) {
            const jacket = leatherJackets[jacketIndex];
            
            // Wybierz 6-8 rozmiarów dla tej kurtki
            const selectedSizes = sizes.slice(0, 8);
            
            for (let sizeIndex = 0; sizeIndex < selectedSizes.length; sizeIndex++) {
                const size = selectedSizes[sizeIndex];
                
                // Przypisz do punktu (rotacja)
                const pointIndex = (jacketIndex * selectedSizes.length + sizeIndex) % sellingPoints.length;
                const sellingPoint = sellingPoints[pointIndex];
                
                // 1-2 sztuki każdego rozmiaru
                const quantity = Math.floor(Math.random() * 2) + 1;
                
                for (let q = 0; q < quantity; q++) {
                    const barcode = `LJ-${jacket.kod || 'NOK'}-${size.name}-${String(Date.now() + Math.random()).slice(-8)}`;
                    
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
                    
                    // Pokaż przykłady pierwszych 15 pozycji
                    if (totalItems <= 15) {
                        console.log(`📍 ${sellingPoint.sellingPoint}: ${jacket.nazwa} ${size.name} (${barcode})`);
                    }
                }
            }
        }
        
        console.log(`\n📊 Przygotowano ${stateEntries.length} pozycji stanu magazynowego`);
        
        if (stateEntries.length > 15) {
            console.log('   ... i więcej (pokazano tylko pierwsze 15)');
        }
        
        // 5. Zapisz do bazy danych
        console.log('\n💾 Zapisywanie do bazy danych...');
        
        const batchSize = 50;
        let saved = 0;
        
        for (let i = 0; i < stateEntries.length; i += batchSize) {
            const batch = stateEntries.slice(i, i + batchSize);
            await State.insertMany(batch);
            saved += batch.length;
            console.log(`✅ Zapisano: ${saved}/${stateEntries.length} pozycji`);
        }
        
        // 6. Podsumowanie
        console.log(`\n🎉 UKOŃCZONO DODAWANIE STANU MAGAZYNOWEGO!\n`);
        
        console.log('📋 Podsumowanie według punktów sprzedaży:');
        for (const point of sellingPoints) {
            const count = stateEntries.filter(entry => 
                entry.sellingPoint.toString() === point._id.toString()
            ).length;
            console.log(`🏪 ${point.sellingPoint}: ${count} sztuk`);
        }
        
        console.log(`\n📊 STATYSTYKI:`);
        console.log(`   📦 Łączna liczba sztuk: ${stateEntries.length}`);
        console.log(`   🧥 Różne kurtki: ${leatherJackets.length}`);
        console.log(`   📏 Rozmiary: ${sizes.slice(0, 8).map(s => s.name).join(', ')}`);
        console.log(`   🏪 Punkty sprzedaży: ${sellingPoints.length}`);
        
        console.log(`\n💡 PRZYKŁAD ROZKŁADU:`);
        console.log(`   • Taty: Adela CZARNY rozmiary XL, 2XL, 3XL`);
        console.log(`   • Pod Most: Adela CZARNY rozmiary 4XL, 7XL, itd.`);
        console.log(`   • Każdy punkt ma różne rozmiary`);
        
    } catch (error) {
        console.error('❌ Błąd:', error.message);
        console.error(error.stack);
    }
    
    mongoose.connection.close();
    console.log('\n🔌 Rozłączono z bazą danych');
    
}).catch(error => {
    console.error('❌ Błąd połączenia z bazą danych:', error.message);
    process.exit(1);
});