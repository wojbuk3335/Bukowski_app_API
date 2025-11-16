const mongoose = require('mongoose');
const State = require('./app/db/models/state');
const Goods = require('./app/db/models/goods');
const Size = require('./app/db/models/size');
const User = require('./app/db/models/user');

mongoose.connect('mongodb+srv://wbukowski1985:3VX4byVnTO2CFRPc@bukowskiapp.emdzg.mongodb.net/BukowskiApp?retryWrites=true&w=majority&appName=BukowskiApp').then(async () => {
    console.log('🔗 Połączono z bazą danych MongoDB Atlas');
    
    try {
        // 1. Usuń wszystkie stany magazynowe i zacznij od nowa z kontrolowaną ilością
        console.log('🧹 Usuwam wszystkie stany magazynowe...');
        const deletedCount = await State.deleteMany({});
        console.log(`🗑️ Usunięto ${deletedCount.deletedCount} pozycji`);
        
        // 2. Znajdź kurtki skórzane
        const leatherJackets = await Goods.find({
            nazwa: { $regex: /adela|beatrice|diana|elena|felicia|aisha|ada/i }
        }).limit(10); // Tylko 10 kurtek dla kontrolowanej ilości
        
        console.log(`\n📦 Wybranych kurtek: ${leatherJackets.length}`);
        
        // 3. Znajdź rozmiary
        const sizes = await Size.find({}).limit(4); // Tylko 4 rozmiary
        console.log(`📏 Wybranych rozmiarów: ${sizes.length}`);
        
        // 4. Znajdź punkty sprzedaży
        const sellingPoints = await User.find({ role: 'user' }).limit(3); // Tylko 3 punkty
        console.log(`🏪 Wybranych punktów: ${sellingPoints.length}`);
        
        console.log('\n🎯 Generowanie kontrolowanego stanu magazynowego...');
        console.log('📍 Każda kurtka w każdym rozmiarze - maksymalnie 3 sztuki w różnych punktach\n');
        
        const stateEntries = [];
        let itemCounter = 0;
        
        for (const jacket of leatherJackets) {
            for (const size of sizes) {
                // Dla każdej kombinacji kurtka+rozmiar, dodaj po 1 sztuce w maksymalnie 3 punktach
                const pointsToUse = sellingPoints.slice(0, 3); // Maksymalnie 3 punkty
                
                for (const point of pointsToUse) {
                    const barcode = `CL-${jacket.kod || 'NOK'}-${size.name || 'SIZE'}-${point.symbol || 'PT'}-${String(Date.now() + Math.random()).slice(-4)}`;
                    
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
                    itemCounter++;
                    
                    // Pokaż pierwsze przykłady
                    if (itemCounter <= 15) {
                        console.log(`📍 ${point.sellingPoint}: ${jacket.nazwa} ${size.name || 'rozmiar'} (${barcode})`);
                    }
                }
            }
        }
        
        console.log(`\n📊 Przygotowano ${stateEntries.length} pozycji stanu magazynowego`);
        
        if (stateEntries.length > 15) {
            console.log('   ... i więcej (pokazano tylko pierwsze 15)');
        }
        
        // 5. Zapisz do bazy
        console.log('\n💾 Zapisywanie do bazy danych...');
        await State.insertMany(stateEntries);
        console.log(`✅ Zapisano ${stateEntries.length} pozycji`);
        
        // 6. Weryfikacja
        const finalCount = await State.countDocuments({});
        console.log(`\n🎉 TWORZENIE KONTROLOWANEGO STANU UKOŃCZONE!`);
        console.log(`📊 Łączna liczba pozycji: ${finalCount}`);
        
        // 7. Podsumowanie według punktów
        console.log('\n📋 Rozkład według punktów sprzedaży:');
        for (const point of sellingPoints) {
            const count = stateEntries.filter(entry => 
                entry.sellingPoint.toString() === point._id.toString()
            ).length;
            console.log(`🏪 ${point.sellingPoint}: ${count} sztuk`);
        }
        
        console.log(`\n📊 STATYSTYKI:`);
        console.log(`   🧥 Kurtki: ${leatherJackets.length}`);
        console.log(`   📏 Rozmiary: ${sizes.length}`);
        console.log(`   🏪 Punkty: ${sellingPoints.length}`);
        console.log(`   📦 Łącznie: ${leatherJackets.length} × ${sizes.length} × ${sellingPoints.length} = ${stateEntries.length} pozycji`);
        
        console.log(`\n💡 PRZYKŁAD ROZKŁADU:`);
        console.log(`   🧥 Każda kurtka (np. Adela CZARNY) w każdym rozmiarze:`);
        console.log(`      • ${sellingPoints[0]?.sellingPoint}: 1 sztuka`);
        console.log(`      • ${sellingPoints[1]?.sellingPoint}: 1 sztuka`);
        console.log(`      • ${sellingPoints[2]?.sellingPoint}: 1 sztuka`);
        console.log(`      • Maksymalnie 3 sztuki tej samej kurtki w tym samym rozmiarze!`);
        
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