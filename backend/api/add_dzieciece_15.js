const mongoose = require('mongoose');
const Goods = require('./app/db/models/goods');
const config = require('./app/config');

// Lista nazw produktów dziecięcych
const childrenProductsNames = [
    // 10 kożuchów dziecięcych
    "Kożuch dziecięcy Classic", "Kożuch dziecięcy Premium", "Kożuch dziecięcy Deluxe", 
    "Kożuch dziecięcy Mini", "Kożuch dziecięcy Junior", "Kożuch dziecięcy Comfort",
    "Kożuch dziecięcy Style", "Kożuch dziecięcy Modern", "Kożuch dziecięcy Elegant",
    "Kożuch dziecięcy Royal",
    // 5 kamizelek dziecięcych
    "Kamizelka dziecięca Sport", "Kamizelka dziecięca Casual", "Kamizelka dziecięca Smart",
    "Kamizelka dziecięca Active", "Kamizelka dziecięca Cool"
];

async function addChildrenProducts() {
    try {
        console.log('🚀 Rozpoczynam dodawanie 15 produktów dziecięcych...');

        // Połącz z bazą danych
        await mongoose.connect(config.database, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('✅ Połączono z bazą danych');

        // 1. Znajdź lub utwórz podkategorię "Kożuch dziecięcy" w SubcategoryCoats
        const SubcategoryCoats = require('./app/db/models/subcategoryCoats');

        let kozuchDzieciecy = await SubcategoryCoats.findOne({ Kat_1_Opis_1: 'Kożuch dziecięcy' });
        if (!kozuchDzieciecy) {
            kozuchDzieciecy = new SubcategoryCoats({
                Kat_1_ID: 'KOZ_DZIEC_001',
                Kat_1_Opis_1: 'Kożuch dziecięcy'
            });
            await kozuchDzieciecy.save();
            console.log('✅ Utworzono podkategorię: Kożuch dziecięcy');
        } else {
            console.log('✅ Znaleziono istniejącą podkategorię: Kożuch dziecięcy');
        }

        // 2. Znajdź lub utwórz podkategorię "Kamizelka dziecięca" w SubcategoryCoats
        let kamizelkaDzieciecy = await SubcategoryCoats.findOne({ Kat_1_Opis_1: 'Kamizelka dziecięca' });
        if (!kamizelkaDzieciecy) {
            kamizelkaDzieciecy = new SubcategoryCoats({
                Kat_1_ID: 'KAM_DZIEC_001',
                Kat_1_Opis_1: 'Kamizelka dziecięca'
            });
            await kamizelkaDzieciecy.save();
            console.log('✅ Utworzono podkategorię: Kamizelka dziecięca');
        } else {
            console.log('✅ Znaleziono istniejącą podkategorię: Kamizelka dziecięca');
        }

        // 3. Znajdź producenta Bukowski
        const ManufacturerModel = mongoose.model('manufacturers', new mongoose.Schema({
            Prod_ID: String,
            Prod_Opis: String
        }));

        const bukowskiManufacturer = await ManufacturerModel.findOne({ Prod_Opis: 'Bukowski' });
        if (!bukowskiManufacturer) {
            throw new Error('❌ Nie znaleziono producenta Bukowski');
        }
        console.log('✅ Znaleziono producenta Bukowski:', bukowskiManufacturer._id);

        // 4. Znajdź domyślny kolor (biały)
        const ColorModel = mongoose.model('colors', new mongoose.Schema({
            Color_ID: String,
            Color_Opis: String
        }));

        let whiteColor = await ColorModel.findOne({ Color_Opis: 'biały' });
        if (!whiteColor) {
            whiteColor = new ColorModel({
                Color_ID: 'COL_WHITE_001',
                Color_Opis: 'biały'
            });
            await whiteColor.save();
            console.log('✅ Utworzono kolor: biały');
        }
        console.log('✅ Znaleziono kolor biały:', whiteColor._id);

        // 5. Przygotuj produkty dziecięce
        const childrenProducts = [];

        // 10 kożuchów dziecięcych (kody 4530800000001-4530800000010)
        for (let i = 1; i <= 10; i++) {
            const paddedNumber = i.toString().padStart(3, '0');
            childrenProducts.push({
                _id: new mongoose.Types.ObjectId(),
                fullName: `${childrenProductsNames[i-1]} Bukowski`,
                code: `4530800000${paddedNumber}`,
                price: 299.99,
                discount_price: 249.99,
                category: 'Kurtki kożuchy futra',
                subcategory: kozuchDzieciecy._id,
                manufacturer: bukowskiManufacturer._id,
                color: whiteColor._id,
                Plec: 'U', // Unisex dla dzieci
                symbol: `KOZ-DZ-${paddedNumber}`,
                sellingPoint: 'Wszystkie',
                barcode: `453080000${paddedNumber}`,
                isSelectedForPrint: false,
                rowBackgroundColor: '#ffffff'
            });
        }

        // 5 kamizelek dziecięcych (kody 4530900000001-4530900000005)
        for (let i = 1; i <= 5; i++) {
            const paddedNumber = i.toString().padStart(3, '0');
            childrenProducts.push({
                _id: new mongoose.Types.ObjectId(),
                fullName: `${childrenProductsNames[9+i]} Bukowski`,
                code: `4530900000${paddedNumber}`,
                price: 199.99,
                discount_price: 159.99,
                category: 'Kurtki kożuchy futra',
                subcategory: kamizelkaDzieciecy._id,
                manufacturer: bukowskiManufacturer._id,
                color: whiteColor._id,
                Plec: 'U', // Unisex dla dzieci
                symbol: `KAM-DZ-${paddedNumber}`,
                sellingPoint: 'Wszystkie',
                barcode: `453090000${paddedNumber}`,
                isSelectedForPrint: false,
                rowBackgroundColor: '#ffffff'
            });
        }

        console.log(`📦 Przygotowano ${childrenProducts.length} produktów dziecięcych do dodania...`);

        // 6. Sprawdź ile produktów już istnieje w bazie
        const existingCount = await Goods.countDocuments({
            category: 'Kurtki kożuchy futra',
            subcategory: { $in: [kozuchDzieciecy._id, kamizelkaDzieciecy._id] }
        });
        console.log(`📊 Aktualna liczba produktów dziecięcych w bazie: ${existingCount}`);

        // 7. Dodaj produkty do bazy danych
        let addedCount = 0;
        for (const product of childrenProducts) {
            try {
                // Sprawdź czy produkt już istnieje
                const existingProduct = await Goods.findOne({ code: product.code });
                if (existingProduct) {
                    console.log(`⚠️  Produkt już istnieje: ${product.code} - ${product.fullName}`);
                    continue;
                }

                // Dodaj nowy produkt
                const newProduct = new Goods(product);
                await newProduct.save();
                addedCount++;
                console.log(`✅ Dodano: ${product.code} - ${product.fullName}`);
            } catch (error) {
                console.error(`❌ Błąd przy dodawaniu produktu ${product.code}:`, error.message);
            }
        }

        // 8. Podsumowanie
        const finalCount = await Goods.countDocuments({
            category: 'Kurtki kożuchy futra',
            subcategory: { $in: [kozuchDzieciecy._id, kamizelkaDzieciecy._id] }
        });

        console.log('\n🎉 PODSUMOWANIE DODAWANIA PRODUKTÓW DZIECIĘCYCH:');
        console.log(`📊 Produkty dziecięce przed operacją: ${existingCount}`);
        console.log(`➕ Nowo dodane produkty: ${addedCount}`);
        console.log(`📊 Produkty dziecięce po operacji: ${finalCount}`);
        console.log(`🎯 Cel: 15 produktów dziecięcych`);
        
        if (finalCount >= 15) {
            console.log('✅ SUKCES! Osiągnięto cel 15 produktów dziecięcych!');
        } else {
            console.log(`⚠️  Potrzeba jeszcze ${15 - finalCount} produktów, aby osiągnąć cel.`);
        }

        // 9. Wyświetl szczegółowe informacje
        console.log('\n📋 PRODUKTY DZIECIĘCE W BAZIE DANYCH:');
        const allChildrenProducts = await Goods.find({
            category: 'Kurtki kożuchy futra',
            subcategory: { $in: [kozuchDzieciecy._id, kamizelkaDzieciecy._id] }
        }).populate('subcategory').populate('manufacturer');

        allChildrenProducts.forEach((product, index) => {
            const subcategoryName = product.subcategory?.Kat_1_Opis_1 || 'Nieznana';
            console.log(`${index + 1}. ${product.code} - ${product.fullName} (${subcategoryName})`);
        });

    } catch (error) {
        console.error('💥 Błąd podczas dodawania produktów dziecięcych:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Rozłączono z bazą danych');
    }
}

// Uruchom skrypt
addChildrenProducts();