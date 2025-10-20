const mongoose = require('mongoose');
const Goods = require('./app/db/models/goods');
const Size = require('./app/db/models/size');
const User = require('./app/db/models/user');
const State = require('./app/db/models/state');

// Connection string
mongoose.connect('mongodb+srv://wbukowski1985:3VX4byVnTO2CFRPc@bukowskiapp.emdzg.mongodb.net/BukowskiApp?retryWrites=true&w=majority&appName=BukowskiApp').then(async () => {
    console.log('🔗 Połączono z bazą danych MongoDB Atlas');

    try {
        // 1. Pobierz kurtki męskie licówki
        const menJackets = await Goods.find({ 
            category: "Kurtki kożuchy futra",
            Rodzaj: "M"
        }).lean();
        
        console.log(`👔 Znaleziono ${menJackets.length} kurtek męskich w bazie danych`);

        // 2. Pobierz rozmiary od XXS do 8XL
        const sizeNames = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL', '7XL', '8XL'];
        const sizes = await Size.find({ nazwa: { $in: sizeNames } }).lean();
        
        console.log(`📏 Znaleziono ${sizes.length} rozmiarów: ${sizes.map(s => s.nazwa).join(', ')}`);

        // 3. Pobierz punkty sprzedaży
        const sellingPoints = await User.find({ 
            funkcja: { $in: ['T', 'M', 'P'] } 
        }).lean();
        
        console.log(`🏪 Znaleziono ${sellingPoints.length} punktów sprzedaży: ${sellingPoints.map(p => p.funkcja).join(', ')}`);

        // 4. Funkcja do losowania
        function getRandomInt(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }

        function getRandomElement(array) {
            return array[Math.floor(Math.random() * array.length)];
        }

        // 5. Generuj losowe stany magazynowe
        const targetInventoryCount = getRandomInt(150, 200);
        console.log(`🎯 Cel: ${targetInventoryCount} stanów magazynowych`);

        const inventoryEntries = [];
        const usedCombinations = new Set();

        let attempts = 0;
        const maxAttempts = targetInventoryCount * 3; // Zabezpieczenie przed nieskończoną pętlą

        while (inventoryEntries.length < targetInventoryCount && attempts < maxAttempts) {
            attempts++;

            // Losuj kurtkę, rozmiar i punkt sprzedaży
            const jacket = getRandomElement(menJackets);
            const size = getRandomElement(sizes);
            const sellingPoint = getRandomElement(sellingPoints);

            // Utwórz unikalny klucz kombinacji
            const combinationKey = `${jacket._id}-${size._id}-${sellingPoint._id}`;

            // Sprawdź czy kombinacja już istnieje
            if (usedCombinations.has(combinationKey)) {
                continue;
            }

            // Dodaj kombinację do użytych
            usedCombinations.add(combinationKey);

            // Losuj ilość (1-5 sztuk)
            const quantity = getRandomInt(1, 5);

            // Utwórz wpis do inwentarza
            const inventoryEntry = {
                fullName: jacket._id,  // Reference to Goods
                date: new Date(),
                barcode: jacket.code,  // Use jacket's barcode
                size: size._id,
                sellingPoint: sellingPoint._id,
                price: jacket.price,
                discount_price: jacket.discount_price,
                ilosc: quantity
            };

            inventoryEntries.push(inventoryEntry);

            // Progress co 25 wpisów
            if (inventoryEntries.length % 25 === 0) {
                console.log(`📦 Przygotowano: ${inventoryEntries.length}/${targetInventoryCount} stanów`);
            }
        }

        console.log(`\n✅ Przygotowano ${inventoryEntries.length} stanów magazynowych po ${attempts} próbach`);

        // 6. Dodaj do bazy danych
        console.log(`\n💾 Dodawanie do bazy danych...`);
        let addedCount = 0;
        let errorCount = 0;

        for (const entry of inventoryEntries) {
            try {
                const state = new State({
                    _id: new mongoose.Types.ObjectId(),
                    fullName: entry.fullName,
                    date: entry.date,
                    barcode: entry.barcode,
                    size: entry.size,
                    sellingPoint: entry.sellingPoint,
                    price: entry.price,
                    discount_price: entry.discount_price
                });

                await state.save();
                addedCount++;

                if (addedCount % 25 === 0) {
                    console.log(`✅ Dodano: ${addedCount}/${inventoryEntries.length} stanów`);
                }

            } catch (error) {
                errorCount++;
                console.error(`❌ Błąd przy dodawaniu stanu:`, error.message);
            }
        }

        // 7. Statystyki
        console.log(`\n🎉 UKOŃCZONO DODAWANIE STANÓW MAGAZYNOWYCH!`);
        console.log(`✅ Dodano: ${addedCount} stanów`);
        console.log(`❌ Błędów: ${errorCount}`);

        // 8. Analiza dodanych stanów
        const totalStates = await State.countDocuments({});
        console.log(`📊 Wszystkich stanów w bazie: ${totalStates}`);

        // Sprawdź rozkład po rozmiarach
        console.log(`\n📏 ROZKŁAD PO ROZMIARACH (z nowo dodanych):`);
        const sizeStats = {};
        for (const entry of inventoryEntries) {
            const sizeName = sizes.find(s => s._id.toString() === entry.size.toString())?.nazwa || 'Nieznany';
            sizeStats[sizeName] = (sizeStats[sizeName] || 0) + 1;
        }

        for (const sizeName of sizeNames) {
            const count = sizeStats[sizeName] || 0;
            console.log(`   ${sizeName}: ${count} stanów`);
        }

        // Sprawdź rozkład po punktach sprzedaży
        console.log(`\n🏪 ROZKŁAD PO PUNKTACH SPRZEDAŻY:`);
        const pointStats = {};
        for (const entry of inventoryEntries) {
            const pointName = sellingPoints.find(p => p._id.toString() === entry.sellingPoint.toString())?.funkcja || 'Nieznany';
            pointStats[pointName] = (pointStats[pointName] || 0) + 1;
        }

        Object.entries(pointStats).forEach(([point, count]) => {
            console.log(`   ${point}: ${count} stanów`);
        });

        // Sprawdź całkowitą ilość kurtek
        console.log(`\n👔 ŁĄCZNA ILOŚĆ KURTEK DODANYCH: ${inventoryEntries.length} stanów`);

        // Przykłady dodanych stanów
        console.log(`\n💡 PRZYKŁADY DODANYCH STANÓW:`);
        const sampleEntries = inventoryEntries.slice(0, 5);
        for (let i = 0; i < sampleEntries.length; i++) {
            const entry = sampleEntries[i];
            const jacket = menJackets.find(j => j._id.toString() === entry.fullName.toString());
            const size = sizes.find(s => s._id.toString() === entry.size.toString());
            const point = sellingPoints.find(p => p._id.toString() === entry.sellingPoint.toString());
            
            console.log(`   ${i + 1}. ${jacket?.fullName || 'Nieznana kurtka'} - ${size?.nazwa || 'Nieznany rozmiar'} - ${point?.funkcja || 'Nieznany punkt'} - ${entry.price} zł`);
        }

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