const mongoose = require('mongoose');
const Goods = require('./app/db/models/goods');
const Category = require('./app/db/models/category');
const SubcategoryCoats = require('./app/db/models/subcategoryCoats');
const Color = require('./app/db/models/color');
const Size = require('./app/db/models/size');
const User = require('./app/db/models/user');
const State = require('./app/db/models/state');

// Connection string
mongoose.connect('mongodb+srv://wbukowski1985:3VX4byVnTO2CFRPc@bukowskiapp.emdzg.mongodb.net/BukowskiApp?retryWrites=true&w=majority&appName=BukowskiApp').then(async () => {
    console.log('🔗 Połączono z bazą danych MongoDB Atlas');

    try {
        // Dane kurtek męskich licówek
        const menLeatherJackets = [
            { lp: 131, product: "32", color: "BRĄZOWY", fullName: "32 BRĄZOWY", barcode: "4530400000004", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "HAG", price: 950, discountPrice: null, exceptions: "", gender: "M" },
            { lp: 132, product: "Adam I", color: "CZARNY", fullName: "Adam I CZARNY", barcode: "4000600000000", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "POS", price: 850, discountPrice: null, exceptions: "", gender: "M" },
            { lp: 133, product: "Alan", color: "CZARNY", fullName: "Alan CZARNY", barcode: "4020600000008", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "POS", price: 850, discountPrice: null, exceptions: "", gender: "M" },
            { lp: 134, product: "Alan", color: "SZARY", fullName: "Alan SZARY", barcode: "4022000000008", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "POS", price: 850, discountPrice: null, exceptions: "", gender: "M" },
            { lp: 135, product: "Amadeusz", color: "CZARNY", fullName: "Amadeusz CZARNY", barcode: "4050600000005", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "HAG", price: 950, discountPrice: null, exceptions: "", gender: "M" },
            { lp: 136, product: "Ambroży", color: "CZARNY", fullName: "Ambroży CZARNY", barcode: "5500600000004", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "HAG", price: 950, discountPrice: null, exceptions: "", gender: "M" },
            { lp: 137, product: "Albert", color: "CZARNY", fullName: "Albert CZARNY", barcode: "4030600000007", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "SAG", price: 890, discountPrice: null, exceptions: "", gender: "M" },
            { lp: 138, product: "Amir", color: "BRĄZOWY", fullName: "Amir BRĄZOWY", barcode: "4540400000003", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "ART", price: 950, discountPrice: null, exceptions: "", gender: "M" },
            { lp: 139, product: "Antek", color: "CZARNY", fullName: "Antek CZARNY", barcode: "4060600000004", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "ART", price: 850, discountPrice: null, exceptions: "5XL=950, 6XL=950", gender: "M" },
            { lp: 140, product: "Arkadiusz", color: "CZARNY", fullName: "Arkadiusz CZARNY", barcode: "4070600000003", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "HAG", price: 850, discountPrice: null, exceptions: "5XL=950, 6XL=950", gender: "M" },
            { lp: 141, product: "Arnold", color: "RUDY", fullName: "Arnold RUDY", barcode: "4552300000007", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "ART", price: 850, discountPrice: null, exceptions: "5XL=950, 6XL=950", gender: "M" },
            { lp: 142, product: "Arnold", color: "CZARNY", fullName: "Arnold CZARNY", barcode: "4550600000000", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "ART", price: 850, discountPrice: null, exceptions: "5XL=950, 6XL=950", gender: "M" },
            { lp: 143, product: "Artur", color: "CZERWONY", fullName: "Artur CZERWONY", barcode: "4090700000000", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "ART", price: 850, discountPrice: null, exceptions: "", gender: "M" },
            { lp: 144, product: "Artur", color: "NIEBIESKI", fullName: "Artur NIEBIESKI", barcode: "4091600000008", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "ART", price: 850, discountPrice: null, exceptions: "", gender: "M" },
            { lp: 145, product: "Bartłomiej", color: "CZARNY", fullName: "Bartłomiej CZARNY", barcode: "4110600000006", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "SAG", price: 950, discountPrice: null, exceptions: "", gender: "M" },
            { lp: 146, product: "Dawid", color: "CZARNY", fullName: "Dawid CZARNY", barcode: "4130600000004", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "POS", price: 649, discountPrice: null, exceptions: "", gender: "M" },
            { lp: 147, product: "Dominik", color: "CZARNY", fullName: "Dominik CZARNY", barcode: "4560600000009", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "ART", price: 950, discountPrice: null, exceptions: "", gender: "M" },
            { lp: 148, product: "Dominik", color: "BRĄZOWY", fullName: "Dominik BRĄZOWY", barcode: "4560400000001", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "ART", price: 950, discountPrice: null, exceptions: "", gender: "M" },
            { lp: 149, product: "Filip", color: "CZARNY", fullName: "Filip CZARNY", barcode: "4140600000003", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "OSS", price: 1390, discountPrice: null, exceptions: "", gender: "M" },
            { lp: 150, product: "Grzegorz", color: "GRANATOWY", fullName: "Grzegorz GRANATOWY", barcode: "4151100000004", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "POS", price: 750, discountPrice: null, exceptions: "", gender: "M" },
            { lp: 151, product: "Ireneusz I", color: "CZARNY", fullName: "Ireneusz I CZARNY", barcode: "4170600000000", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "SAG", price: 850, discountPrice: null, exceptions: "5XL=950, 6XL=950", gender: "M" },
            { lp: 152, product: "Ireneusz I", color: "BORDOWY", fullName: "Ireneusz I BORDOWY", barcode: "4170300000003", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "SAG", price: 850, discountPrice: null, exceptions: "5XL=950, 6XL=950", gender: "M" },
            { lp: 153, product: "Ireneusz II", color: "RUDY", fullName: "Ireneusz II RUDY", barcode: "4582300000004", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "ARS", price: 850, discountPrice: null, exceptions: "", gender: "M" },
            { lp: 154, product: "Jakub", color: "CZARNY", fullName: "Jakub CZARNY", barcode: "4190600000008", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "POS", price: 850, discountPrice: null, exceptions: "", gender: "M" },
            { lp: 155, product: "Kajetan", color: "CZARNY", fullName: "Kajetan CZARNY", barcode: "4590600000006", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "HAG", price: 850, discountPrice: null, exceptions: "", gender: "M" },
            { lp: 156, product: "Kordian", color: "CZARNY", fullName: "Kordian CZARNY", barcode: "4250600000009", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "SAG", price: 890, discountPrice: null, exceptions: "", gender: "M" },
            { lp: 157, product: "Leon", color: "SZARY", fullName: "Leon SZARY", barcode: "4272000000007", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "MAX", price: 950, discountPrice: null, exceptions: "", gender: "M" },
            { lp: 158, product: "Maciej", color: "SZARY", fullName: "Maciej SZARY", barcode: "4602000000002", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "HAG", price: 850, discountPrice: null, exceptions: "5XL=950, 6XL=950", gender: "M" },
            { lp: 159, product: "Marcel", color: "CZARNY", fullName: "Marcel CZARNY", barcode: "4320600000009", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "OSS", price: 950, discountPrice: null, exceptions: "", gender: "M" },
            { lp: 160, product: "Marcin", color: "BRĄZOWY", fullName: "Marcin BRĄZOWY", barcode: "4330400000000", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "MNP", price: 850, discountPrice: null, exceptions: "64=950", gender: "M" },
            { lp: 161, product: "Marcin", color: "CZARNY", fullName: "Marcin CZARNY", barcode: "4330600000008", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "MNP", price: 850, discountPrice: null, exceptions: "64=950", gender: "M" },
            { lp: 162, product: "Marian I", color: "GRAFITOWY", fullName: "Marian I GRAFITOWY", barcode: "4351000000009", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "ART", price: 850, discountPrice: null, exceptions: "5XL=950, 6XL=1150", gender: "M" },
            { lp: 163, product: "Mariusz", color: "CZARNY", fullName: "Mariusz CZARNY", barcode: "4370600000004", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "MAX", price: 850, discountPrice: null, exceptions: "5XL=950, 6XL=950, 7XL=950, 8XL=950", gender: "M" },
            { lp: 164, product: "Mariusz", color: "BRĄZOWY", fullName: "Mariusz BRĄZOWY", barcode: "4370400000006", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "MAX", price: 850, discountPrice: null, exceptions: "5XL=950, 6XL=950, 7XL=950, 8XL=950", gender: "M" },
            { lp: 165, product: "Marynarka", color: "CZARNY", fullName: "Marynarka CZARNY", barcode: "4610600000001", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "POS", price: 1090, discountPrice: null, exceptions: "", gender: "M" },
            { lp: 166, product: "Patryk", color: "GRANATOWY", fullName: "Patryk GRANATOWY", barcode: "4401100000000", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "POS", price: 750, discountPrice: null, exceptions: "", gender: "M" },
            { lp: 167, product: "Robert", color: "GRANATOWY", fullName: "Robert GRANATOWY", barcode: "4421100000008", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "ART", price: 890, discountPrice: null, exceptions: "5XL=950, 6XL=1150", gender: "M" },
            { lp: 168, product: "Roland", color: "CZARNY", fullName: "Roland CZARNY", barcode: "4430600000005", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "SAG", price: 850, discountPrice: null, exceptions: "5XL=950", gender: "M" },
            { lp: 169, product: "Samuel", color: "BRĄZOWY", fullName: "Samuel BRĄZOWY", barcode: "4450400000005", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "MNP", price: 750, discountPrice: null, exceptions: "", gender: "M" },
            { lp: 170, product: "Ignacy", color: "CZARNY", fullName: "Ignacy CZARNY", barcode: "4570600000008", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "MNP", price: 750, discountPrice: null, exceptions: "", gender: "M" },
            { lp: 171, product: "Stanisław", color: "CZARNY", fullName: "Stanisław CZARNY", barcode: "4470600000001", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "MAX", price: 850, discountPrice: null, exceptions: "5XL=950, 6XL=950, 7XL=950", gender: "M" },
            { lp: 172, product: "Stanisław", color: "GRANATOWY", fullName: "Stanisław GRANATOWY", barcode: "4471100000003", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "MAX", price: 850, discountPrice: null, exceptions: "5XL=950, 6XL=950, 7XL=950", gender: "M" },
            { lp: 173, product: "Szczepan", color: "CZARNY", fullName: "Szczepan CZARNY", barcode: "4480600000000", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "ART", price: 890, discountPrice: null, exceptions: "5XL=950", gender: "M" },
            { lp: 174, product: "Wojciech", color: "GRANATOWY", fullName: "Wojciech GRANATOWY", barcode: "4521100000005", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "ART", price: 850, discountPrice: null, exceptions: "5XL=950", gender: "M" },
            { lp: 175, product: "Zbigniew", color: "CZARNY", fullName: "Zbigniew CZARNY", barcode: "4620600000000", category: "Kurtki kożuchy futra", subcategory: "Kurtka męska licówka", group: "ART", price: 950, discountPrice: null, exceptions: "", gender: "M" }
        ];

        console.log(`\n📦 Przygotowano ${menLeatherJackets.length} kurtek męskich licówek do dodania`);

        // 1. Znajdź lub utwórz kategorię
        let category = await Category.findOne({ nazwa: 'Kurtki kożuchy futra' });
        if (!category) {
            console.log('➕ Tworzę kategorię "Kurtki kożuchy futra"');
            category = new Category({
                _id: new mongoose.Types.ObjectId(),
                nazwa: 'Kurtki kożuchy futra'
            });
            await category.save();
        }
        console.log(`✅ Kategoria: ${category.nazwa} (ID: ${category._id})`);

        // 2. Znajdź lub utwórz podkategorię
        let subcategory = await SubcategoryCoats.findOne({ nazwa: 'Kurtka męska licówka' });
        if (!subcategory) {
            console.log('➕ Tworzę podkategorię "Kurtka męska licówka"');
            subcategory = new SubcategoryCoats({
                _id: new mongoose.Types.ObjectId(),
                nazwa: 'Kurtka męska licówka',
                kategoria: category._id
            });
            await subcategory.save();
        }
        console.log(`✅ Podkategoria: ${subcategory.nazwa} (ID: ${subcategory._id})`);

        // 3. Przygotuj kolory
        const uniqueColors = [...new Set(menLeatherJackets.map(jacket => jacket.color))];
        console.log(`\n🎨 Kolory do utworzenia: ${uniqueColors.join(', ')}`);

        const colorMap = {};
        for (const colorName of uniqueColors) {
            let color = await Color.findOne({ nazwa: colorName });
            if (!color) {
                console.log(`➕ Tworzę kolor: ${colorName}`);
                color = new Color({
                    _id: new mongoose.Types.ObjectId(),
                    nazwa: colorName
                });
                await color.save();
            }
            colorMap[colorName] = color._id;
            console.log(`✅ Kolor: ${colorName} (ID: ${color._id})`);
        }

        // 4. Dodaj kurtki męskie
        console.log(`\n🧥 Dodawanie ${menLeatherJackets.length} kurtek męskich...`);
        let addedJacketsCount = 0;
        let skippedJacketsCount = 0;
        const addedJackets = [];

        for (const jacketData of menLeatherJackets) {
            try {
                // Sprawdź czy już istnieje
                const existingJacket = await Goods.findOne({ fullName: jacketData.fullName });
                if (existingJacket) {
                    console.log(`⚠️  Pomijam: ${jacketData.fullName} (już istnieje)`);
                    skippedJacketsCount++;
                    continue;
                }

                const jacket = new Goods({
                    _id: new mongoose.Types.ObjectId(),
                    fullName: jacketData.fullName,
                    code: jacketData.barcode,
                    price: jacketData.price,
                    discount_price: jacketData.discountPrice,
                    category: jacketData.category,
                    subcategory: subcategory._id,
                    color: colorMap[jacketData.color],
                    Rodzaj: jacketData.gender,
                    symbol: jacketData.group
                });

                await jacket.save();
                addedJacketsCount++;
                addedJackets.push(jacket);
                
                if (addedJacketsCount % 10 === 0) {
                    console.log(`✅ Dodano: ${addedJacketsCount}/${menLeatherJackets.length} kurtek`);
                }

            } catch (error) {
                console.error(`❌ Błąd przy dodawaniu ${jacketData.fullName}:`, error.message);
                skippedJacketsCount++;
            }
        }

        console.log(`\n🎉 UKOŃCZONO DODAWANIE KURTEK MĘSKICH!`);
        console.log(`✅ Dodano: ${addedJacketsCount} kurtek`);
        console.log(`⚠️  Pominięto: ${skippedJacketsCount} kurtek (dublety lub błędy)`);

        // 5. Teraz dodaj stany magazynowe TYLKO dla T, M, P (bez SUPER_ADMIN i LIMITED_ADMIN)
        console.log(`\n📦 DODAWANIE STANÓW MAGAZYNOWYCH (bez SUPER_ADMIN i LIMITED_ADMIN)...`);

        // Pobierz rozmiary od XXS do 8XL
        const sizeNames = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL', '7XL', '8XL'];
        const sizes = await Size.find({ nazwa: { $in: sizeNames } }).lean();
        console.log(`📏 Znaleziono ${sizes.length} rozmiarów: ${sizes.map(s => s.nazwa).join(', ')}`);

        // Pobierz TYLKO punkty sprzedaży T, M, P (bez SUPER_ADMIN i LIMITED_ADMIN)
        const sellingPoints = await User.find({ 
            funkcja: { $in: ['T', 'M', 'P'] } 
        }).lean();
        console.log(`🏪 Znaleziono ${sellingPoints.length} punktów sprzedaży (T, M, P): ${sellingPoints.map(p => p.funkcja).join(', ')}`);

        // Funkcje pomocnicze
        function getRandomInt(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }

        function getRandomElement(array) {
            return array[Math.floor(Math.random() * array.length)];
        }

        // Generuj losowe stany magazynowe
        const targetInventoryCount = getRandomInt(150, 200);
        console.log(`🎯 Cel: ${targetInventoryCount} stanów magazynowych`);

        const inventoryEntries = [];
        const usedCombinations = new Set();

        let attempts = 0;
        const maxAttempts = targetInventoryCount * 3;

        while (inventoryEntries.length < targetInventoryCount && attempts < maxAttempts) {
            attempts++;

            // Losuj kurtkę, rozmiar i punkt sprzedaży (tylko T, M, P)
            const jacket = getRandomElement(addedJackets);
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
        console.log(`\n🎉 UKOŃCZONO DODAWANIE STANÓW MAGAZYNOWYCH!`);
        console.log(`✅ Dodano stanów: ${addedStatesCount}`);
        console.log(`❌ Błędów: ${errorStatesCount}`);

        const totalStates = await State.countDocuments({});
        const totalGoods = await Goods.countDocuments({});
        console.log(`📊 Wszystkich stanów w bazie: ${totalStates}`);
        console.log(`📦 Wszystkich produktów w bazie: ${totalGoods}`);

        // Rozkład po punktach sprzedaży
        console.log(`\n🏪 ROZKŁAD PO PUNKTACH SPRZEDAŻY (tylko T, M, P):`);
        const pointStats = {};
        for (const entry of inventoryEntries) {
            const pointName = sellingPoints.find(p => p._id.toString() === entry.sellingPoint.toString())?.funkcja || 'Nieznany';
            pointStats[pointName] = (pointStats[pointName] || 0) + 1;
        }

        Object.entries(pointStats).forEach(([point, count]) => {
            console.log(`   ${point}: ${count} stanów`);
        });

        // Przykłady dodanych stanów
        console.log(`\n💡 PRZYKŁADY DODANYCH STANÓW:`);
        const sampleEntries = inventoryEntries.slice(0, 5);
        for (let i = 0; i < sampleEntries.length; i++) {
            const entry = sampleEntries[i];
            const jacket = addedJackets.find(j => j._id.toString() === entry.fullName.toString());
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