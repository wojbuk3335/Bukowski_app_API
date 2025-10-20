const mongoose = require('mongoose');
const State = require('./app/db/models/state');
const Goods = require('./app/db/models/goods');
const Size = require('./app/db/models/size');
const User = require('./app/db/models/user');

// Użyj tego samego connection stringu co w import_leather_jackets.js
mongoose.connect('mongodb+srv://wbukowski1985:3VX4byVnTO2CFRPc@bukowskiapp.emdzg.mongodb.net/BukowskiApp?retryWrites=true&w=majority&appName=BukowskiApp').then(async () => {
    console.log('🔗 Połączono z bazą danych MongoDB Atlas');
    
    try {
        // 1. Znajdź wszystkie kurtki skórzane damskie
        const leatherJackets = await Goods.find({
            nazwa: { $regex: /adela|beatrice|diana|elena|felicia|aisha|ada/i }
        });
        
        console.log(`\n📦 Znaleziono ${leatherJackets.length} kurtek skórzanych damskich`);
        
        if (leatherJackets.length === 0) {
            console.log('❌ Brak kurtek skórzanych damskich. Uruchom najpierw import_leather_jackets.js');
            process.exit();
        }
        
        // 2. Znajdź rozmiary
        const sizes = await Size.find({});
        console.log(`📏 Dostępne rozmiary: ${sizes.length}`);
        
        // 3. Znajdź istniejące punkty sprzedaży
        const sellingPoints = await User.find({ role: 'user' });
        console.log(`🏪 Punkty sprzedaży: ${sellingPoints.length}`);
        
        if (sellingPoints.length === 0) {
            console.log('❌ Brak punktów sprzedaży. Uruchom najpierw add_inventory_zakopane.js');
            process.exit();
        }
        
        sellingPoints.forEach((point, i) => {
            console.log(`   ${i + 1}. ${point.sellingPoint} - ${point.location || 'Lokalizacja nieznana'}`);
        });
        
        // 4. Generuj dodatkowy stan magazynowy z duplikatami
        console.log('\n🎯 Generowanie dodatkowego stanu magazynowego z duplikatami...');
        console.log('📍 Każda kurtka będzie dostępna w tym samym rozmiarze w różnych punktach\n');
        
        const stateEntries = [];
        let totalItems = 0;
        
        // Weź pierwsze 20 kurtek aby nie przeciążyć bazy
        const selectedJackets = leatherJackets.slice(0, 20);
        console.log(`🧥 Wybrano ${selectedJackets.length} kurtek do duplikacji`);
        
        // Wybierz 6 popularnych rozmiarów
        const popularSizes = sizes.slice(0, 6); // XS, S, M, L, XL, 2XL
        console.log(`📏 Rozmiary do duplikacji: ${popularSizes.map(s => s.name).join(', ')}`);
        
        for (const jacket of selectedJackets) {
            for (const size of popularSizes) {
                // Każdy rozmiar każdej kurtki będzie dostępny w KAŻDYM punkcie sprzedaży
                for (const point of sellingPoints) {
                    // 1-3 sztuki każdego rozmiaru w każdym punkcie
                    const quantity = Math.floor(Math.random() * 3) + 1;
                    
                    for (let q = 0; q < quantity; q++) {
                        const barcode = `DUP-${jacket.kod || 'NOK'}-${size.name}-${point.symbol}-${String(Date.now() + Math.random()).slice(-6)}`;
                        
                        const stateEntry = {
                            _id: new mongoose.Types.ObjectId(),
                            fullName: jacket._id,
                            date: new Date(),
                            barcode: barcode,
                            size: size._id,
                            sellingPoint: point._id,
                            price: jacket.cena_sprzedazy || 299.99,
                            discount_price: jacket.cena_promocyjna || null
                        };
                        
                        stateEntries.push(stateEntry);
                        totalItems++;
                        
                        // Pokaż przykłady pierwszych 20 pozycji
                        if (totalItems <= 20) {
                            console.log(`📍 ${point.sellingPoint}: ${jacket.nazwa} ${size.name || 'rozmiar'} (${barcode})`);
                        }
                    }
                }
            }
        }
        
        console.log(`\n📊 Przygotowano ${stateEntries.length} nowych pozycji stanu magazynowego`);
        
        if (stateEntries.length > 20) {
            console.log('   ... i więcej (pokazano tylko pierwsze 20)');
        }
        
        // 5. Zapisz do bazy danych
        console.log('\n💾 Zapisywanie do bazy danych...');
        
        const batchSize = 100;
        let saved = 0;
        
        for (let i = 0; i < stateEntries.length; i += batchSize) {
            const batch = stateEntries.slice(i, i + batchSize);
            await State.insertMany(batch);
            saved += batch.length;
            console.log(`✅ Zapisano: ${saved}/${stateEntries.length} pozycji`);
        }
        
        // 6. Podsumowanie
        console.log(`\n🎉 UKOŃCZONO DODAWANIE DUPLIKATÓW!\n`);
        
        // Sprawdź aktualny stan w bazie
        const totalStateCount = await State.countDocuments({});
        console.log(`📊 ŁĄCZNY STAN W BAZIE: ${totalStateCount} pozycji`);
        
        console.log('\n📋 Nowo dodane pozycje według punktów sprzedaży:');
        for (const point of sellingPoints) {
            const count = stateEntries.filter(entry => 
                entry.sellingPoint.toString() === point._id.toString()
            ).length;
            console.log(`🏪 ${point.sellingPoint}: +${count} nowych sztuk`);
        }
        
        console.log(`\n📊 STATYSTYKI NOWYCH DUPLIKATÓW:`);
        console.log(`   📦 Nowych pozycji: ${stateEntries.length}`);
        console.log(`   🧥 Duplikowane kurtki: ${selectedJackets.length}`);
        console.log(`   📏 Rozmiary: ${popularSizes.map(s => s.name).join(', ')}`);
        console.log(`   🏪 Punkty sprzedaży: ${sellingPoints.length}`);
        
        console.log(`\n💡 PRZYKŁAD DUPLIKACJI:`);
        console.log(`   🧥 Adela CZARNY rozmiar M:`);
        for (const point of sellingPoints.slice(0, 3)) {
            const jacketCount = stateEntries.filter(entry => 
                entry.sellingPoint.toString() === point._id.toString()
            ).length / popularSizes.length; // Przybliżona liczba na punkt
            
            console.log(`      • ${point.sellingPoint}: ~${Math.floor(jacketCount)} sztuk`);
        }
        console.log(`      • ... (we wszystkich punktach)`);
        
        console.log(`\n🎯 REZULTAT: Teraz ta sama kurtka w tym samym rozmiarze jest dostępna w różnych punktach!`);
        
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