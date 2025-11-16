const mongoose = require('mongoose');
const User = require('./app/db/models/user');
const State = require('./app/db/models/state');
const Goods = require('./app/db/models/goods');
const Size = require('./app/db/models/size');

mongoose.connect('mongodb+srv://wbukowski1985:3VX4byVnTO2CFRPc@bukowskiapp.emdzg.mongodb.net/BukowskiApp?retryWrites=true&w=majority&appName=BukowskiApp').then(async () => {
    console.log('🔗 Połączono z bazą danych MongoDB Atlas');

    try {
        // 1. Usuń istniejące stany kurtek męskich
        const menJackets = await Goods.find({ 
            category: "Kurtki kożuchy futra",
            Rodzaj: "M"
        }).lean();
        
        const menJacketIds = menJackets.map(jacket => jacket._id);
        
        const deleteResult = await State.deleteMany({
            fullName: { $in: menJacketIds }
        });
        
        console.log(`🗑️  Usunięto ${deleteResult.deletedCount} istniejących stanów kurtek męskich`);

        // 2. Stwórz lub znajdź użytkowników z właściwymi funkcjami
        const sellingPointFunctions = ['T', 'M', 'S', 'P', 'X'];
        const sellingPoints = [];

        for (const func of sellingPointFunctions) {
            let user = await User.findOne({ funkcja: func });
            
            if (!user) {
                console.log(`➕ Tworzę użytkownika z funkcją: ${func}`);
                user = new User({
                    _id: new mongoose.Types.ObjectId(),
                    login: `punkt_${func.toLowerCase()}`,
                    funkcja: func,
                    haslo: 'default123', // Domyślne hasło
                    email: `${func.toLowerCase()}@example.com`
                });
                await user.save();
            }
            
            sellingPoints.push(user);
            console.log(`✅ Punkt sprzedaży ${func}: ${user._id}`);
        }

        console.log(`\n🏪 Utworzono/znaleziono ${sellingPoints.length} punktów sprzedaży: ${sellingPoints.map(p => p.funkcja).join(', ')}`);

        // 3. Pobierz rozmiary
        const sizeNames = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL', '7XL', '8XL'];
        const sizes = await Size.find({ nazwa: { $in: sizeNames } }).lean();
        console.log(`📏 Znaleziono ${sizes.length} rozmiarów`);

        // 4. Funkcje pomocnicze
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
        const maxAttempts = targetInventoryCount * 3;

        while (inventoryEntries.length < targetInventoryCount && attempts < maxAttempts) {
            attempts++;

            // Losuj kurtkę, rozmiar i punkt sprzedaży (tylko T, M, S, P, X)
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

            // Utwórz wpis do inwentarza
            const inventoryEntry = {
                fullName: jacket._id,
                date: new Date(),
                barcode: jacket.code,
                size: size._id,
                sellingPoint: sellingPoint._id,
                price: jacket.price,
                discount_price: jacket.discount_price
            };

            inventoryEntries.push(inventoryEntry);

            // Progress co 25 wpisów
            if (inventoryEntries.length % 25 === 0) {
                console.log(`📦 Przygotowano: ${inventoryEntries.length}/${targetInventoryCount} stanów`);
            }
        }

        console.log(`\n✅ Przygotowano ${inventoryEntries.length} stanów magazynowych po ${attempts} próbach`);

        // 6. Dodaj do bazy danych
        console.log(`\n💾 Dodawanie stanów do bazy danych...`);
        let addedStatesCount = 0;
        let errorStatesCount = 0;

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
                addedStatesCount++;

                if (addedStatesCount % 25 === 0) {
                    console.log(`✅ Dodano: ${addedStatesCount}/${inventoryEntries.length} stanów`);
                }

            } catch (error) {
                errorStatesCount++;
                console.error(`❌ Błąd przy dodawaniu stanu:`, error.message);
            }
        }

        // 7. Statystyki końcowe
        console.log(`\n🎉 UKOŃCZONO POPRAWKĘ STANÓW MAGAZYNOWYCH!`);
        console.log(`✅ Dodano stanów: ${addedStatesCount}`);
        console.log(`❌ Błędów: ${errorStatesCount}`);

        const totalStates = await State.countDocuments({});
        console.log(`📊 Wszystkich stanów w bazie: ${totalStates}`);

        // Rozkład po punktach sprzedaży
        console.log(`\n🏪 ROZKŁAD PO PUNKTACH SPRZEDAŻY (T, M, S, P, X):`);
        const pointStats = {};
        for (const entry of inventoryEntries) {
            const pointName = sellingPoints.find(p => p._id.toString() === entry.sellingPoint.toString())?.funkcja || 'Nieznany';
            pointStats[pointName] = (pointStats[pointName] || 0) + 1;
        }

        Object.entries(pointStats).forEach(([point, count]) => {
            console.log(`   ${point}: ${count} stanów`);
        });

        // Rozkład po rozmiarach
        console.log(`\n📏 ROZKŁAD PO ROZMIARACH:`);
        const sizeStats = {};
        for (const entry of inventoryEntries) {
            const sizeName = sizes.find(s => s._id.toString() === entry.size.toString())?.nazwa || 'Nieznany';
            sizeStats[sizeName] = (sizeStats[sizeName] || 0) + 1;
        }

        sizeNames.forEach(sizeName => {
            const count = sizeStats[sizeName] || 0;
            console.log(`   ${sizeName}: ${count} stanów`);
        });

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