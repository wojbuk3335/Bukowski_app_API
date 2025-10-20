const mongoose = require('mongoose');
const State = require('./app/db/models/state');
const Goods = require('./app/db/models/goods');
const Size = require('./app/db/models/size');

// KONFIGURACJA - zmień connection string na odpowiedni
const DB_CONNECTION = 'mongodb://localhost:27017/bukowski_app';
// Dla produkcji użyj: 'mongodb+srv://wojbuk3335:buk2137owski@cluster0.auap8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'

mongoose.connect(DB_CONNECTION).then(async () => {
    console.log('🔗 Połączono z bazą danych');
    
    try {
        // Znajdź kurtki skórzane damskie (dodane wcześniej)
        const leatherJackets = await Goods.find({
            $or: [
                { nazwa: { $regex: /adela|beatrice|diana|elena|felicia/i } },
                { opis: { $regex: /kurtka.*skórzana.*damska/i } }
            ]
        });
        
        console.log(`\n📦 Znaleziono ${leatherJackets.length} kurtek skórzanych damskich`);
        
        if (leatherJackets.length === 0) {
            console.log('❌ Brak kurtek skórzanych w bazie. Uruchom najpierw import_leather_jackets.js');
            process.exit();
        }
        
        // Znajdź rozmiary damskie
        const sizes = await Size.find({
            name: { $in: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL', '7XL', '8XL'] }
        });
        
        console.log(`📏 Dostępne rozmiary: ${sizes.map(s => s.name).join(', ')}`);
        
        // Przykładowe ID punktów sprzedaży (zastąp rzeczywistymi ID z bazy)
        // W prawdziwej implementacji pobierz je z bazy danych
        const sellingPointIds = [
            new mongoose.Types.ObjectId(), // Taty
            new mongoose.Types.ObjectId(), // Pod Most  
            new mongoose.Types.ObjectId(), // Rynek
            new mongoose.Types.ObjectId(), // Krupówki
            new mongoose.Types.ObjectId()  // Gubałówka
        ];
        
        const pointNames = ['Taty', 'Pod Most', 'Rynek', 'Krupówki', 'Gubałówka'];
        
        // Generuj stan magazynowy
        const stateEntries = [];
        let itemCounter = 0;
        
        console.log('\n🎯 Generowanie stanu magazynowego...\n');
        
        for (let i = 0; i < leatherJackets.length; i++) {
            const jacket = leatherJackets[i];
            const jacketName = jacket.nazwa;
            
            // Każda kurtka dostaje różne rozmiary w różnych punktach
            const sizesForThisJacket = sizes.slice(0, 8); // 8 rozmiarów na kurtkę
            
            for (let sizeIndex = 0; sizeIndex < sizesForThisJacket.length; sizeIndex++) {
                const size = sizesForThisJacket[sizeIndex];
                const pointIndex = sizeIndex % sellingPointIds.length; // Rotacja między punktami
                const sellingPointId = sellingPointIds[pointIndex];
                const pointName = pointNames[pointIndex];
                
                // 1-3 sztuki każdego rozmiaru w każdym punkcie
                const quantity = Math.floor(Math.random() * 3) + 1;
                
                for (let q = 0; q < quantity; q++) {
                    // Unikalny barcode
                    const barcode = `LJ${String(Date.now()).slice(-6)}-${i}-${sizeIndex}-${q}`;
                    
                    const stateEntry = {
                        _id: new mongoose.Types.ObjectId(),
                        fullName: jacket._id,
                        date: new Date(),
                        barcode: barcode,
                        size: size._id,
                        sellingPoint: sellingPointId,
                        price: jacket.cena_sprzedazy || 299.99,
                        discount_price: jacket.cena_promocyjna || null
                    };
                    
                    stateEntries.push(stateEntry);
                    itemCounter++;
                    
                    // Wyświetl przykłady
                    if (itemCounter <= 10) {
                        console.log(`📍 ${pointName}: ${jacketName} rozmiar ${size.name} - ${barcode}`);
                    }
                }
            }
        }
        
        console.log(`\n📊 Przygotowano ${stateEntries.length} pozycji stanu magazynowego`);
        console.log('💾 Zapisywanie do bazy danych...\n');
        
        // Zapisz w partiach po 100 sztuk
        const batchSize = 100;
        let saved = 0;
        
        for (let i = 0; i < stateEntries.length; i += batchSize) {
            const batch = stateEntries.slice(i, i + batchSize);
            await State.insertMany(batch);
            saved += batch.length;
            console.log(`✅ Zapisano: ${saved}/${stateEntries.length}`);
        }
        
        // Podsumowanie według punktów
        console.log(`\n🎉 UKOŃCZONO DODAWANIE STANU!\n`);
        console.log('📋 Podsumowanie według punktów sprzedaży:');
        
        for (let i = 0; i < sellingPointIds.length; i++) {
            const pointId = sellingPointIds[i];
            const pointName = pointNames[i];
            const count = stateEntries.filter(entry => 
                entry.sellingPoint.toString() === pointId.toString()
            ).length;
            console.log(`🏪 ${pointName}: ${count} sztuk`);
        }
        
        console.log(`\n📦 Łączna liczba sztuk: ${stateEntries.length}`);
        console.log(`🧥 Liczba różnych kurtek: ${leatherJackets.length}`);
        console.log(`📏 Rozmiary: ${sizes.map(s => s.name).join(', ')}`);
        
        console.log('\n💡 PRZYKŁAD ROZKŁADU:');
        console.log('   Taty: Adela CZARNY XL, 2XL, 3XL');
        console.log('   Pod Most: Adela CZARNY 4XL, 7XL, itd...');
        console.log('   (każdy punkt ma różne rozmiary tej samej kurtki)');
        
    } catch (error) {
        console.error('❌ Błąd:', error.message);
        console.error(error.stack);
    }
    
    process.exit();
}).catch(error => {
    console.error('❌ Błąd połączenia z bazą danych:', error.message);
    console.log('\n💡 Sprawdź:');
    console.log('1. Czy MongoDB jest uruchomione');
    console.log('2. Czy connection string jest poprawny');
    console.log('3. Zmień DB_CONNECTION na początku pliku jeśli potrzebujesz');
    process.exit(1);
});