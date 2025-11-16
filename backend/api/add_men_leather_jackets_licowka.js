const mongoose = require('mongoose');
const Goods = require('./app/db/models/goods');
const SubcategoryCoats = require('./app/db/models/subcategoryCoats');
const Stock = require('./app/db/models/stock');
const Color = require('./app/db/models/color');
const Manufacturer = require('./app/db/models/manufacturer');

// Kurtki męskie licówki - 45 produktów
const menJacketsData = [
    { name: "32", color: "BRĄZOWY", fullName: "32 BRĄZOWY", code: "4530400000004", price: 950, manufacturer: "HAG" },
    { name: "Adam I", color: "CZARNY", fullName: "Adam I CZARNY", code: "4000600000000", price: 850, manufacturer: "POS" },
    { name: "Alan", color: "CZARNY", fullName: "Alan CZARNY", code: "4020600000008", price: 850, manufacturer: "POS" },
    { name: "Alan", color: "SZARY", fullName: "Alan SZARY", code: "4022000000008", price: 850, manufacturer: "POS" },
    { name: "Amadeusz", color: "CZARNY", fullName: "Amadeusz CZARNY", code: "4050600000005", price: 950, manufacturer: "HAG" },
    { name: "Ambroży", color: "CZARNY", fullName: "Ambroży CZARNY", code: "5500600000004", price: 950, manufacturer: "HAG" },
    { name: "Albert", color: "CZARNY", fullName: "Albert CZARNY", code: "4030600000007", price: 890, manufacturer: "SAG" },
    { name: "Amir", color: "BRĄZOWY", fullName: "Amir BRĄZOWY", code: "4540400000003", price: 950, manufacturer: "ART" },
    { name: "Antek", color: "CZARNY", fullName: "Antek CZARNY", code: "4060600000004", price: 850, manufacturer: "ART" },
    { name: "Arkadiusz", color: "CZARNY", fullName: "Arkadiusz CZARNY", code: "4070600000003", price: 850, manufacturer: "HAG" },
    { name: "Arnold", color: "RUDY", fullName: "Arnold RUDY", code: "4552300000007", price: 850, manufacturer: "ART" },
    { name: "Arnold", color: "CZARNY", fullName: "Arnold CZARNY", code: "4550600000000", price: 850, manufacturer: "ART" },
    { name: "Artur", color: "CZERWONY", fullName: "Artur CZERWONY", code: "4090700000000", price: 850, manufacturer: "ART" },
    { name: "Artur", color: "NIEBIESKI", fullName: "Artur NIEBIESKI", code: "4091600000008", price: 850, manufacturer: "ART" },
    { name: "Bartłomiej", color: "CZARNY", fullName: "Bartłomiej CZARNY", code: "4110600000006", price: 950, manufacturer: "SAG" },
    { name: "Dawid", color: "CZARNY", fullName: "Dawid CZARNY", code: "4130600000004", price: 649, manufacturer: "POS" },
    { name: "Dominik", color: "CZARNY", fullName: "Dominik CZARNY", code: "4560600000009", price: 950, manufacturer: "ART" },
    { name: "Dominik", color: "BRĄZOWY", fullName: "Dominik BRĄZOWY", code: "4560400000001", price: 950, manufacturer: "ART" },
    { name: "Filip", color: "CZARNY", fullName: "Filip CZARNY", code: "4140600000003", price: 1390, manufacturer: "OSS" },
    { name: "Grzegorz", color: "GRANATOWY", fullName: "Grzegorz GRANATOWY", code: "4151100000004", price: 750, manufacturer: "POS" },
    { name: "Ireneusz I", color: "CZARNY", fullName: "Ireneusz I CZARNY", code: "4170600000000", price: 850, manufacturer: "SAG" },
    { name: "Ireneusz I", color: "BORDOWY", fullName: "Ireneusz I BORDOWY", code: "4170300000003", price: 850, manufacturer: "SAG" },
    { name: "Ireneusz II", color: "RUDY", fullName: "Ireneusz II RUDY", code: "4582300000004", price: 850, manufacturer: "ARS" },
    { name: "Jakub", color: "CZARNY", fullName: "Jakub CZARNY", code: "4190600000008", price: 850, manufacturer: "POS" },
    { name: "Kajetan", color: "CZARNY", fullName: "Kajetan CZARNY", code: "4590600000006", price: 850, manufacturer: "HAG" },
    { name: "Kordian", color: "CZARNY", fullName: "Kordian CZARNY", code: "4250600000009", price: 890, manufacturer: "SAG" },
    { name: "Leon", color: "SZARY", fullName: "Leon SZARY", code: "4272000000007", price: 950, manufacturer: "MAX" },
    { name: "Maciej", color: "SZARY", fullName: "Maciej SZARY", code: "4602000000002", price: 850, manufacturer: "HAG" },
    { name: "Marcel", color: "CZARNY", fullName: "Marcel CZARNY", code: "4320600000009", price: 950, manufacturer: "OSS" },
    { name: "Marcin", color: "BRĄZOWY", fullName: "Marcin BRĄZOWY", code: "4330400000000", price: 850, manufacturer: "MNP" },
    { name: "Marcin", color: "CZARNY", fullName: "Marcin CZARNY", code: "4330600000008", price: 850, manufacturer: "MNP" },
    { name: "Marian I", color: "GRAFITOWY", fullName: "Marian I GRAFITOWY", code: "4351000000009", price: 850, manufacturer: "ART" },
    { name: "Mariusz", color: "CZARNY", fullName: "Mariusz CZARNY", code: "4370600000004", price: 850, manufacturer: "MAX" },
    { name: "Mariusz", color: "BRĄZOWY", fullName: "Mariusz BRĄZOWY", code: "4370400000006", price: 850, manufacturer: "MAX" },
    { name: "Marynarka", color: "CZARNY", fullName: "Marynarka CZARNY", code: "4610600000001", price: 1090, manufacturer: "POS" },
    { name: "Patryk", color: "GRANATOWY", fullName: "Patryk GRANATOWY", code: "4401100000000", price: 750, manufacturer: "POS" },
    { name: "Robert", color: "GRANATOWY", fullName: "Robert GRANATOWY", code: "4421100000008", price: 890, manufacturer: "ART" },
    { name: "Roland", color: "CZARNY", fullName: "Roland CZARNY", code: "4430600000005", price: 850, manufacturer: "SAG" },
    { name: "Samuel", color: "BRĄZOWY", fullName: "Samuel BRĄZOWY", code: "4450400000005", price: 750, manufacturer: "MNP" },
    { name: "Ignacy", color: "CZARNY", fullName: "Ignacy CZARNY", code: "4570600000008", price: 750, manufacturer: "MNP" },
    { name: "Stanisław", color: "CZARNY", fullName: "Stanisław CZARNY", code: "4470600000001", price: 850, manufacturer: "MAX" },
    { name: "Stanisław", color: "GRANATOWY", fullName: "Stanisław GRANATOWY", code: "4471100000003", price: 850, manufacturer: "MAX" },
    { name: "Szczepan", color: "CZARNY", fullName: "Szczepan CZARNY", code: "4480600000000", price: 890, manufacturer: "ART" },
    { name: "Wojciech", color: "GRANATOWY", fullName: "Wojciech GRANATOWY", code: "4521100000005", price: 850, manufacturer: "ART" },
    { name: "Zbigniew", color: "CZARNY", fullName: "Zbigniew CZARNY", code: "4620600000000", price: 950, manufacturer: "ART" }
];

// Mapowanie producentów (skróty na pełne nazwy)
const manufacturerMapping = {
    'HAG': 'Hagen',
    'POS': 'Poseidon',
    'SAG': 'Sagittarius',
    'ART': 'Artex',
    'OSS': 'Ossira',
    'MAX': 'Maxim',
    'MNP': 'Monopol',
    'ARS': 'Arsenal'
};

async function addMenLeatherJackets() {
    try {
        // Używamy tej samej bazy co aplikacja
        const config = require('./app/config');
        await mongoose.connect(config.database);
        console.log('✅ Połączono z MongoDB Atlas');

        // Znajdź lub utwórz subcategory "Kurtka męska licówka"
        let subcategory = await SubcategoryCoats.findOne({ 
            Kat_1_Opis_1: 'Kurtka męska licówka' 
        });

        if (!subcategory) {
            console.log('📝 Tworzenie subcategory "Kurtka męska licówka"');
            
            // Znajdź najwyższy Kat_1_Kod_1 i dodaj 1
            const existingSubcategories = await SubcategoryCoats.find().sort({ Kat_1_Kod_1: 1 });
            let maxCode = 0;
            existingSubcategories.forEach(sub => {
                const code = parseInt(sub.Kat_1_Kod_1);
                if (!isNaN(code) && code > maxCode) {
                    maxCode = code;
                }
            });
            
            const newSubcategoryCode = (maxCode + 1).toString();
            
            subcategory = new SubcategoryCoats({
                _id: new mongoose.Types.ObjectId(),
                Kat_1_Kod_1: newSubcategoryCode,
                Kat_1_Opis_1: 'Kurtka męska licówka',
                Plec: 'M'
            });
            await subcategory.save();
        }

        console.log('✅ Znaleziona/utworzona subcategory:', subcategory);

        // Sprawdź ile już mamy kurtek męskich licówek
        const existingCount = await Goods.countDocuments({
            category: 'Kurtki kożuchy futra',
            subcategory: subcategory._id,
            Plec: 'M'
        });

        console.log(`📊 Aktualnie w bazie: ${existingCount} kurtek męskich licówek`);
        console.log(`🎯 Cel: Dodać ${menJacketsData.length} kurtek męskich licówek`);

        // Dodaj wszystkie kurtki męskie
        let addedCount = 0;
        let skippedCount = 0;

        for (const jacket of menJacketsData) {
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

                // Znajdź/utwórz producenta
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
                    Plec: 'M',
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
            Plec: 'M'
        });

        console.log('\n📊 PODSUMOWANIE KURTEK MĘSKICH LICÓWEK:');
        console.log(`✅ Dodano nowych produktów: ${addedCount}`);
        console.log(`⚠️ Pominięto (już istnieją): ${skippedCount}`);
        console.log(`📝 Łącznie przetworzono: ${menJacketsData.length}`);
        console.log(`📊 STAN POCZĄTKOWY: ${existingCount} kurtek męskich licówek`);
        console.log(`📊 STAN KOŃCOWY: ${finalCount} kurtek męskich licówek w bazie`);
        console.log(`👔 Dodano kurtki męskie licówki do kategorii "Kurtki kożuchy futra"`);

    } catch (error) {
        console.error('❌ Błąd:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Rozłączono z MongoDB');
    }
}

// Uruchom skrypt
addMenLeatherJackets().catch(console.error);