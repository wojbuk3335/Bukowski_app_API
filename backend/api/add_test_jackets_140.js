const mongoose = require('mongoose');
const Goods = require('./app/db/models/goods');
const SubcategoryCoats = require('./app/db/models/subcategoryCoats');
const Stock = require('./app/db/models/stock');
const Color = require('./app/db/models/color');
const Manufacturer = require('./app/db/models/manufacturer');

// Dodatkowe kurtki skórzane damskie do testowania limitu 140 - 50 produktów
const testJacketsData = [
    // Serie Magdalena
    { name: "Magdalena", color: "CZARNY", fullName: "Magdalena CZARNY", code: "9140600000001", price: 1200, manufacturer: "POS" },
    { name: "Magdalena", color: "CZERWONY", fullName: "Magdalena CZERWONY", code: "9140700000002", price: 1200, manufacturer: "POS" },
    { name: "Magdalena", color: "NIEBIESKI", fullName: "Magdalena NIEBIESKI", code: "9140500000003", price: 1200, manufacturer: "POS" },
    { name: "Magdalena", color: "BRĄZOWY", fullName: "Magdalena BRĄZOWY", code: "9140400000004", price: 1200, manufacturer: "POS" },
    { name: "Magdalena", color: "SZARY", fullName: "Magdalena SZARY", code: "9142000000005", price: 1200, manufacturer: "POS" },
    
    // Serie Natalia
    { name: "Natalia", color: "CZARNY", fullName: "Natalia CZARNY", code: "9150600000006", price: 990, manufacturer: "CAR" },
    { name: "Natalia", color: "BORDOWY", fullName: "Natalia BORDOWY", code: "9150300000007", price: 990, manufacturer: "CAR" },
    { name: "Natalia", color: "ECRU", fullName: "Natalia ECRU", code: "9150800000008", price: 990, manufacturer: "CAR" },
    { name: "Natalia", color: "KAKAO", fullName: "Natalia KAKAO", code: "9151200000009", price: 990, manufacturer: "CAR" },
    { name: "Natalia", color: "GRANATOWY", fullName: "Natalia GRANATOWY", code: "9151100000010", price: 990, manufacturer: "CAR" },
    
    // Serie Olivia
    { name: "Olivia", color: "CZARNY", fullName: "Olivia CZARNY", code: "9160600000011", price: 1450, manufacturer: "OSS" },
    { name: "Olivia", color: "CHABROWY", fullName: "Olivia CHABROWY", code: "9160500000012", price: 1450, manufacturer: "OSS" },
    { name: "Olivia", color: "ZIELONY", fullName: "Olivia ZIELONY", code: "9162400000013", price: 1450, manufacturer: "OSS" },
    { name: "Olivia", color: "BIAŁY", fullName: "Olivia BIAŁY", code: "9160200000014", price: 1450, manufacturer: "OSS" },
    { name: "Olivia", color: "ŻÓŁTY", fullName: "Olivia ŻÓŁTY", code: "9162200000015", price: 1450, manufacturer: "OSS" },
    
    // Serie Patrycja
    { name: "Patrycja", color: "CZARNY", fullName: "Patrycja CZARNY", code: "9170600000016", price: 750, manufacturer: "MUR" },
    { name: "Patrycja", color: "BEŻ", fullName: "Patrycja BEŻ", code: "9170100000017", price: 750, manufacturer: "MUR" },
    { name: "Patrycja", color: "OLIWKOWY", fullName: "Patrycja OLIWKOWY", code: "9171700000018", price: 750, manufacturer: "MUR" },
    { name: "Patrycja", color: "POMARAŃCZOWY", fullName: "Patrycja POMARAŃCZOWY", code: "9171800000019", price: 750, manufacturer: "MUR" },
    { name: "Patrycja", color: "NARCICEGI", fullName: "Patrycja NARCICEGI", code: "9171500000020", price: 750, manufacturer: "MUR" },
    
    // Serie Renata
    { name: "Renata", color: "CZARNY", fullName: "Renata CZARNY", code: "9180600000021", price: 1350, manufacturer: "SAG" },
    { name: "Renata", color: "MUTON SZARY", fullName: "Renata MUTON SZARY", code: "9181400000022", price: 1350, manufacturer: "SAG" },
    { name: "Renata", color: "RUDY", fullName: "Renata RUDY", code: "9182300000023", price: 1350, manufacturer: "SAG" },
    { name: "Renata", color: "BORDOWY", fullName: "Renata BORDOWY", code: "9180300000024", price: 1350, manufacturer: "SAG" },
    { name: "Renata", color: "SZARY", fullName: "Renata SZARY", code: "9182000000025", price: 1350, manufacturer: "SAG" },
    
    // Serie Sylwia
    { name: "Sylwia", color: "CZARNY", fullName: "Sylwia CZARNY", code: "9190600000026", price: 850, manufacturer: "DOG" },
    { name: "Sylwia", color: "CZERWONY", fullName: "Sylwia CZERWONY", code: "9190700000027", price: 850, manufacturer: "DOG" },
    { name: "Sylwia", color: "NIEBIESKI", fullName: "Sylwia NIEBIESKI", code: "9191600000028", price: 850, manufacturer: "DOG" },
    { name: "Sylwia", color: "BRĄZOWY", fullName: "Sylwia BRĄZOWY", code: "9190400000029", price: 850, manufacturer: "DOG" },
    { name: "Sylwia", color: "ECRU", fullName: "Sylwia ECRU", code: "9190800000030", price: 850, manufacturer: "DOG" },
    
    // Serie Teresa
    { name: "Teresa", color: "CZARNY", fullName: "Teresa CZARNY", code: "9200600000031", price: 1590, manufacturer: "MIT" },
    { name: "Teresa", color: "KAKAO", fullName: "Teresa KAKAO", code: "9201200000032", price: 1590, manufacturer: "MIT" },
    { name: "Teresa", color: "CHABROWY", fullName: "Teresa CHABROWY", code: "9200500000033", price: 1590, manufacturer: "MIT" },
    { name: "Teresa", color: "GRANATOWY", fullName: "Teresa GRANATOWY", code: "9201100000034", price: 1590, manufacturer: "MIT" },
    { name: "Teresa", color: "ZIELONY", fullName: "Teresa ZIELONY", code: "9202400000035", price: 1590, manufacturer: "MIT" },
    
    // Serie Urszula
    { name: "Urszula", color: "CZARNY", fullName: "Urszula CZARNY", code: "9210600000036", price: 1100, manufacturer: "CAT" },
    { name: "Urszula", color: "BIAŁY", fullName: "Urszula BIAŁY", code: "9210200000037", price: 1100, manufacturer: "CAT" },
    { name: "Urszula", color: "ŻÓŁTY", fullName: "Urszula ŻÓŁTY", code: "9212200000038", price: 1100, manufacturer: "CAT" },
    { name: "Urszula", color: "BEŻ", fullName: "Urszula BEŻ", code: "9210100000039", price: 1100, manufacturer: "CAT" },
    { name: "Urszula", color: "OLIWKOWY", fullName: "Urszula OLIWKOWY", code: "9211700000040", price: 1100, manufacturer: "CAT" },
    
    // Serie Weronika
    { name: "Weronika", color: "CZARNY", fullName: "Weronika CZARNY", code: "9220600000041", price: 950, manufacturer: "ARS" },
    { name: "Weronika", color: "POMARAŃCZOWY", fullName: "Weronika POMARAŃCZOWY", code: "9221800000042", price: 950, manufacturer: "ARS" },
    { name: "Weronika", color: "NARCICEGI", fullName: "Weronika NARCICEGI", code: "9221500000043", price: 950, manufacturer: "ARS" },
    { name: "Weronika", color: "MUTON SZARY", fullName: "Weronika MUTON SZARY", code: "9221400000044", price: 950, manufacturer: "ARS" },
    { name: "Weronika", color: "RUDY", fullName: "Weronika RUDY", code: "9222300000045", price: 950, manufacturer: "ARS" },
    
    // Serie Zofia
    { name: "Zofia", color: "CZARNY", fullName: "Zofia CZARNY", code: "9230600000046", price: 1490, manufacturer: "BAR" },
    { name: "Zofia", color: "BORDOWY", fullName: "Zofia BORDOWY", code: "9230300000047", price: 1490, manufacturer: "BAR" },
    { name: "Zofia", color: "SZARY", fullName: "Zofia SZARY", code: "9232000000048", price: 1490, manufacturer: "BAR" },
    { name: "Zofia", color: "CZERWONY", fullName: "Zofia CZERWONY", code: "9230700000049", price: 1490, manufacturer: "BAR" },
    { name: "Zofia", color: "NIEBIESKI", fullName: "Zofia NIEBIESKI", code: "9231600000050", price: 1490, manufacturer: "BAR" }
];

// Mapowanie producentów (skróty na pełne nazwy)
const manufacturerMapping = {
    'POS': 'Poseidon',
    'OSS': 'Ossira',
    'CAR': 'Carmen',
    'MUR': 'Murano',
    'SAG': 'Sagittarius',
    'DOG': 'Dogma',
    'MIT': 'Mitis',
    'CAT': 'Catania',
    'ARS': 'Arsenal',
    'BAR': 'Bartex',
    'ROS': 'Rosito',
    'MAY': 'Maya'
};

async function addTestJacketsFor140() {
    try {
        // Używamy tej samej bazy co aplikacja
        const config = require('./app/config');
        await mongoose.connect(config.database);
        console.log('✅ Połączono z MongoDB Atlas');

        // Znajdź istniejącą subcategory "Kurtka skórzana damska"
        const subcategory = await SubcategoryCoats.findOne({ 
            Kat_1_Opis_1: 'Kurtka skórzana damska' 
        });

        if (!subcategory) {
            console.error('❌ Nie znaleziono subcategory "Kurtka skórzana damska"');
            return;
        }

        console.log('✅ Znaleziona subcategory:', subcategory);

        // Sprawdź ile już mamy kurtek skórzanych damskich
        const existingCount = await Goods.countDocuments({
            category: 'Kurtki kożuchy futra',
            subcategory: subcategory._id,
            Plec: 'D'
        });

        console.log(`📊 Aktualnie w bazie: ${existingCount} kurtek skórzanych damskich`);
        console.log(`🎯 Cel: Dodać ${testJacketsData.length} kurtek do testowania limitu 140`);

        // Dodaj wszystkie testowe kurtki
        let addedCount = 0;
        let skippedCount = 0;

        for (const jacket of testJacketsData) {
            try {
                // Sprawdź czy produkt już istnieje
                const existingProduct = await Goods.findOne({
                    $or: [
                        { fullName: jacket.fullName },
                        { code: jacket.code }
                    ]
                });

                if (existingProduct) {
                    console.log(`⚠️ Pomijam - produkt już istnieje: ${jacket.fullName}`);
                    skippedCount++;
                    continue;
                }

                // Znajdź/utwórz kolor z unikalnym kodem
                let color = await Color.findOne({ Kol_Opis: jacket.color });
                if (!color) {
                    console.log(`📝 Tworzenie koloru: ${jacket.color}`);
                    
                    // Znajdź najwyższy Kol_Kod i dodaj 1
                    const existingColors = await Color.find().sort({ Kol_Kod: 1 });
                    let maxCode = 0;
                    existingColors.forEach(col => {
                        const code = parseInt(col.Kol_Kod);
                        if (!isNaN(code) && code > maxCode) {
                            maxCode = code;
                        }
                    });
                    
                    const newColorCode = (maxCode + 1).toString().padStart(2, '0');
                    
                    color = new Color({
                        _id: new mongoose.Types.ObjectId(),
                        Kol_Kod: newColorCode,
                        Kol_Opis: jacket.color
                    });
                    await color.save();
                }

                // Znajdź/utwórz stock (nazwa modelu) z unikalnym kodem
                let stock = await Stock.findOne({ Tow_Opis: jacket.name });
                if (!stock) {
                    console.log(`📝 Tworzenie stock: ${jacket.name}`);
                    
                    // Znajdź najwyższy Tow_Kod i dodaj 1
                    const existingStocks = await Stock.find().sort({ Tow_Kod: 1 });
                    let maxCode = 0;
                    existingStocks.forEach(stk => {
                        const code = parseInt(stk.Tow_Kod);
                        if (!isNaN(code) && code > maxCode) {
                            maxCode = code;
                        }
                    });
                    
                    const newStockCode = (maxCode + 1).toString().padStart(3, '0');
                    
                    stock = new Stock({
                        _id: new mongoose.Types.ObjectId(),
                        Tow_Kod: newStockCode,
                        Tow_Opis: jacket.name
                    });
                    await stock.save();
                }

                // Znajdź istniejącego producenta (powinni już istnieć)
                const manufacturerName = manufacturerMapping[jacket.manufacturer] || jacket.manufacturer;
                let manufacturer = await Manufacturer.findOne({ Prod_Opis: manufacturerName });
                if (!manufacturer) {
                    console.log(`📝 Tworzenie producenta: ${manufacturerName}`);
                    manufacturer = new Manufacturer({
                        _id: new mongoose.Types.ObjectId(),
                        Prod_Kod: jacket.manufacturer,
                        Prod_Opis: manufacturerName
                    });
                    await manufacturer.save();
                }

                // Utwórz produkt
                const newProduct = new Goods({
                    _id: new mongoose.Types.ObjectId(),
                    stock: stock._id,
                    color: color._id,
                    fullName: jacket.fullName,
                    code: jacket.code,
                    price: jacket.price,
                    discount_price: jacket.discount_price || 0,
                    category: 'Kurtki kożuchy futra',
                    subcategory: subcategory._id,
                    manufacturer: manufacturer._id,
                    Plec: 'D',
                    picture: '',
                    priceExceptions: [],
                    sellingPoint: '',
                    barcode: '',
                    priceKarpacz: 0,
                    discount_priceKarpacz: 0,
                    priceExceptionsKarpacz: [],
                    isSelectedForPrint: false
                });

                await newProduct.save();
                console.log(`✅ Dodano: ${jacket.fullName} - ${jacket.price} zł`);
                addedCount++;

            } catch (error) {
                console.error(`❌ Błąd przy dodawaniu ${jacket.fullName}:`, error.message);
            }
        }

        // Sprawdź końcową liczbę
        const finalCount = await Goods.countDocuments({
            category: 'Kurtki kożuchy futra',
            subcategory: subcategory._id,
            Plec: 'D'
        });

        console.log('\n📊 PODSUMOWANIE TESTOWE:');
        console.log(`✅ Dodano nowych produktów: ${addedCount}`);
        console.log(`⚠️ Pominięto (już istnieją): ${skippedCount}`);
        console.log(`📝 Łącznie przetworzono: ${testJacketsData.length}`);
        console.log(`📊 STAN POCZĄTKOWY: ${existingCount} kurtek skórzanych damskich`);
        console.log(`📊 STAN KOŃCOWY: ${finalCount} kurtek skórzanych damskich w bazie`);
        console.log(`🎯 Limit 140: ${finalCount >= 140 ? '✅ PRZEKROCZONY - można testować blokadę' : `❌ NIE OSIĄGNIĘTY (brakuje ${140 - finalCount})`}`);
        
        if (finalCount >= 140) {
            console.log('🚀 GOTOWE DO TESTOWANIA:');
            console.log('   - System powinien blokować zaznaczanie po 140 kurtkach');
            console.log('   - Sprawdź konsole w przeglądarce dla szczegółowych logów');
            console.log('   - Testuj zaznaczanie pojedyncze i "zaznacz wszystkie"');
        }

    } catch (error) {
        console.error('❌ Błąd:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Rozłączono z MongoDB');
    }
}

// Uruchom skrypt
addTestJacketsFor140().catch(console.error);