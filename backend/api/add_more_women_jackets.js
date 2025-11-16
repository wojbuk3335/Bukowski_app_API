const mongoose = require('mongoose');
const Goods = require('./app/db/models/goods');
const SubcategoryCoats = require('./app/db/models/subcategoryCoats');
const Stock = require('./app/db/models/stock');
const Color = require('./app/db/models/color');
const Manufacturer = require('./app/db/models/manufacturer');

// Dodatkowe kurtki skórzane damskie - 25 produktów
const additionalJacketsData = [
    { name: "Aleksandra", color: "CZARNY", fullName: "Aleksandra CZARNY", code: "9010600000001", price: 1290, manufacturer: "POS" },
    { name: "Aleksandra", color: "CZERWONY", fullName: "Aleksandra CZERWONY", code: "9010700000000", price: 1290, manufacturer: "POS" },
    { name: "Aleksandra", color: "NIEBIESKI", fullName: "Aleksandra NIEBIESKI", code: "9011600000007", price: 1290, manufacturer: "POS" },
    { name: "Anna", color: "CZARNY", fullName: "Anna CZARNY", code: "9020600000000", price: 890, manufacturer: "CAR" },
    { name: "Anna", color: "BRĄZOWY", fullName: "Anna BRĄZOWY", code: "9020400000002", price: 890, manufacturer: "CAR" },
    { name: "Anna", color: "SZARY", fullName: "Anna SZARY", code: "9022000000008", price: 890, manufacturer: "CAR" },
    { name: "Beata Premium", color: "CZARNY", fullName: "Beata Premium CZARNY", code: "9030600000009", price: 1590, manufacturer: "OSS" },
    { name: "Beata Premium", color: "BORDOWY", fullName: "Beata Premium BORDOWY", code: "9030300000001", price: 1590, manufacturer: "OSS" },
    { name: "Celina", color: "ECRU", fullName: "Celina ECRU", code: "9040800000007", price: 750, manufacturer: "DOG" },
    { name: "Celina", color: "KAKAO", fullName: "Celina KAKAO", code: "9041200000006", price: 750, manufacturer: "DOG" },
    { name: "Diana", color: "CZARNY", fullName: "Diana CZARNY", code: "9050600000008", price: 1190, manufacturer: "MUR" },
    { name: "Diana", color: "CHABROWY", fullName: "Diana CHABROWY", code: "9050500000009", price: 1190, manufacturer: "MUR" },
    { name: "Eliza", color: "CZERWONY", fullName: "Eliza CZERWONY", code: "9060700000005", price: 990, manufacturer: "SAG" },
    { name: "Eliza", color: "ZIELONY", fullName: "Eliza ZIELONY", code: "9062400000004", price: 990, manufacturer: "SAG" },
    { name: "Felicja", color: "BIAŁY", fullName: "Felicja BIAŁY", code: "9070200000003", price: 650, manufacturer: "POS" },
    { name: "Felicja", color: "ŻÓŁTY", fullName: "Felicja ŻÓŁTY", code: "9072200000002", price: 650, manufacturer: "POS" },
    { name: "Gabriela", color: "GRANATOWY", fullName: "Gabriela GRANATOWY", code: "9081100000001", price: 1350, manufacturer: "MIT" },
    { name: "Gabriela", color: "BEŻ", fullName: "Gabriela BEŻ", code: "9080100000006", price: 1350, manufacturer: "MIT" },
    { name: "Helena", color: "OLIWKOWY", fullName: "Helena OLIWKOWY", code: "9091700000004", price: 1150, manufacturer: "CAT" },
    { name: "Helena", color: "POMARAŃCZOWY", fullName: "Helena POMARAŃCZOWY", code: "9091800000000", price: 1150, manufacturer: "CAT" },
    { name: "Izabela", color: "NARCICEGI", fullName: "Izabela NARCICEGI", code: "9101500000005", price: 850, manufacturer: "ARS" },
    { name: "Izabela", color: "MUTON SZARY", fullName: "Izabela MUTON SZARY", code: "9101400000003", price: 850, manufacturer: "ARS" },
    { name: "Justyna", color: "RUDY", fullName: "Justyna RUDY", code: "9112300000002", price: 1490, manufacturer: "BAR" },
    { name: "Katarzyna", color: "BORDOWY", fullName: "Katarzyna BORDOWY", code: "9120300000006", price: 1290, manufacturer: "ROS" },
    { name: "Laura", color: "SZARY", fullName: "Laura SZARY", code: "9132000000001", price: 950, manufacturer: "MAY" }
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

async function addMoreWomenLeatherJackets() {
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

        // Dodaj wszystkie dodatkowe kurtki
        let addedCount = 0;
        let skippedCount = 0;

        for (const jacket of additionalJacketsData) {
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

        console.log('\n📊 PODSUMOWANIE:');
        console.log(`✅ Dodano nowych produktów: ${addedCount}`);
        console.log(`⚠️ Pominięto (już istnieją): ${skippedCount}`);
        console.log(`📝 Łącznie przetworzono: ${additionalJacketsData.length}`);
        console.log(`📊 STAN KOŃCOWY: ${finalCount} kurtek skórzanych damskich w bazie`);
        console.log(`🎯 Limit testowy (120) ${finalCount >= 120 ? '✅ PRZEKROCZONY' : '❌ NIE OSIĄGNIĘTY'}`);

    } catch (error) {
        console.error('❌ Błąd:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Rozłączono z MongoDB');
    }
}

// Uruchom skrypt
addMoreWomenLeatherJackets().catch(console.error);