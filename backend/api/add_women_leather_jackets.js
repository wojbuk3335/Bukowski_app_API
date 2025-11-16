const mongoose = require('mongoose');
const Goods = require('./app/db/models/goods');
const SubcategoryCoats = require('./app/db/models/subcategoryCoats');
const Stock = require('./app/db/models/stock');
const Color = require('./app/db/models/color');
const Manufacturer = require('./app/db/models/manufacturer');

// Dane kurtek skórzanych damskich z listy
const jacketsData = [
    { name: "Ada", color: "CZERWONY", fullName: "Ada CZERWONY", code: "0010700000002", price: 1390, manufacturer: "POS" },
    { name: "Adela", color: "CZARNY", fullName: "Adela CZARNY", code: "0020600000002", price: 690, manufacturer: "POS" },
    { name: "Adela", color: "ECRU", fullName: "Adela ECRU", code: "0020800000000", price: 690, manufacturer: "POS" },
    { name: "Adela", color: "GRANATOWY", fullName: "Adela GRANATOWY", code: "0021100000004", price: 690, manufacturer: "POS" },
    { name: "Adela", color: "CHABROWY", fullName: "Adela CHABROWY", code: "0020500000003", price: 690, manufacturer: "POS" },
    { name: "Adela", color: "ZIELONY", fullName: "Adela ZIELONY", code: "0022400000008", price: 690, manufacturer: "POS" },
    { name: "Adela", color: "ŻÓŁTY", fullName: "Adela ŻÓŁTY", code: "0022200000000", price: 690, manufacturer: "POS" },
    { name: "Aisha", color: "BRĄZOWY", fullName: "Aisha BRĄZOWY", code: "0050400000001", price: 950, manufacturer: "OSS" },
    { name: "Aisha", color: "CZARNY", fullName: "Aisha CZARNY", code: "0050600000009", price: 950, manufacturer: "OSS" },
    { name: "Alicja", color: "CZERWONY", fullName: "Alicja CZERWONY", code: "0070700000006", price: 1290, manufacturer: "CAR" },
    { name: "Alina", color: "CZARNY", fullName: "Alina CZARNY", code: "0080600000006", price: 1050, manufacturer: "MUR" },
    { name: "Amanda", color: "CZARNY", fullName: "Amanda CZARNY", code: "0100600000001", price: 690, manufacturer: "SAG" },
    { name: "Aneta II z plisą", color: "CZARNY", fullName: "Aneta II z plisą CZARNY", code: "0140600000007", price: 750, discount_price: 690, manufacturer: "POS" },
    { name: "Aneta", color: "CZARNY", fullName: "Aneta CZARNY", code: "0130600000008", price: 750, discount_price: 690, manufacturer: "POS" },
    { name: "Aneta II z plisą", color: "CZERWONY", fullName: "Aneta II z plisą CZERWONY", code: "0140700000006", price: 750, discount_price: 690, manufacturer: "POS" },
    { name: "Aneta II z plisą", color: "GRANATOWY", fullName: "Aneta II z plisą GRANATOWY", code: "0141100000009", price: 750, discount_price: 690, manufacturer: "POS" },
    { name: "Aneta", color: "KAKAO", fullName: "Aneta KAKAO", code: "0131200000009", price: 750, discount_price: 690, manufacturer: "POS" },
    { name: "Aneta", color: "MUTON SZARY", fullName: "Aneta MUTON SZARY", code: "0131400000007", price: 750, discount_price: 690, manufacturer: "POS" },
    { name: "Aneta II z plisą", color: "ŻÓŁTY", fullName: "Aneta II z plisą ŻÓŁTY", code: "0142200000005", price: 750, discount_price: 690, manufacturer: "POS" },
    { name: "Aniela", color: "BRĄZOWY", fullName: "Aniela BRĄZOWY", code: "1280400000001", price: 1190, manufacturer: "SAG" },
    { name: "Aniela", color: "CZARNY", fullName: "Aniela CZARNY", code: "1280600000009", price: 1190, manufacturer: "SAG" },
    { name: "Anita", color: "CZARNY", fullName: "Anita CZARNY", code: "1140600000006", price: 1090, manufacturer: "CAR" },
    { name: "Barbara", color: "CZARNY", fullName: "Barbara CZARNY", code: "0160600000005", price: 1390, manufacturer: "CAR" },
    { name: "Beata", color: "CZARNY", fullName: "Beata CZARNY", code: "0170600000004", price: 1190, manufacturer: "CAR" },
    { name: "Bella", color: "BORDOWY", fullName: "Bella BORDOWY", code: "0180300000006", price: 990, discount_price: 790, manufacturer: "MUR" },
    { name: "Bona", color: "CZARNY", fullName: "Bona CZARNY", code: "0190600000002", price: 1090, manufacturer: "DOG" },
    { name: "Cecylia", color: "BEŻ", fullName: "Cecylia BEŻ", code: "0210100000002", price: 890, manufacturer: "DOG" },
    { name: "Dagmara", color: "CZARNY", fullName: "Dagmara CZARNY", code: "0220600000006", price: 1290, manufacturer: "CAR" },
    { name: "Danuta", color: "SZARY", fullName: "Danuta SZARY", code: "0232000000005", price: 650, discount_price: 390, manufacturer: "POS" },
    { name: "Dominika", color: "CZARNY", fullName: "Dominika CZARNY", code: "0270600000001", price: 750, discount_price: 690, manufacturer: "POS" },
    { name: "Dominika", color: "KAKAO", fullName: "Dominika KAKAO", code: "0271200000002", price: 750, discount_price: 690, manufacturer: "POS" },
    { name: "Edyta", color: "CZARNY", fullName: "Edyta CZARNY", code: "0290600000009", price: 750, manufacturer: "POS" },
    { name: "Edyta", color: "NARCICEGI", fullName: "Edyta NARCICEGI", code: "0291500000007", price: 750, manufacturer: "POS" },
    { name: "Edyta", color: "ŻÓŁTY", fullName: "Edyta ŻÓŁTY", code: "0292200000007", price: 750, manufacturer: "POS" },
    { name: "Elena", color: "CZARNY", fullName: "Elena CZARNY", code: "0300600000005", price: 1390, manufacturer: "OSS" },
    { name: "Emilia", color: "CZARNY", fullName: "Emilia CZARNY", code: "0340600000001", price: 650, manufacturer: "SAG" },
    { name: "Galina", color: "CZARNY", fullName: "Galina CZARNY", code: "0400600000002", price: 850, manufacturer: "DOG" },
    { name: "Grażyna", color: "GRANATOWY", fullName: "Grażyna GRANATOWY", code: "0411100000003", price: 850, manufacturer: "POS" },
    { name: "Grażyna", color: "BORDOWY", fullName: "Grażyna BORDOWY", code: "0410300000004", price: 850, manufacturer: "POS" },
    { name: "Henia", color: "CZARNY", fullName: "Henia CZARNY", code: "0430600000009", price: 890, manufacturer: "OSS" },
    { name: "Henia", color: "NIEBIESKI", fullName: "Henia NIEBIESKI", code: "0431600000006", price: 890, manufacturer: "OSS" },
    { name: "Henia", color: "BEŻ", fullName: "Henia BEŻ", code: "0430100000004", price: 890, manufacturer: "OSS" },
    { name: "Honorata", color: "BIAŁY", fullName: "Honorata BIAŁY", code: "0440200000002", price: 690, manufacturer: "POS" },
    { name: "Honorata", color: "CZERWONY", fullName: "Honorata CZERWONY", code: "0440700000007", price: 690, manufacturer: "POS" },
    { name: "Honorata", color: "POMARAŃCZOWY", fullName: "Honorata POMARAŃCZOWY", code: "0441800000003", price: 690, manufacturer: "POS" },
    { name: "Honorata", color: "CZARNY", fullName: "Honorata CZARNY", code: "0440600000008", price: 690, manufacturer: "POS" },
    { name: "Ilona", color: "BEŻ", fullName: "Ilona BEŻ", code: "0450100000002", price: 750, manufacturer: "POS" },
    { name: "Ilona", color: "CZARNY", fullName: "Ilona CZARNY", code: "0450600000007", price: 750, manufacturer: "POS" },
    { name: "Ilona", color: "CZERWONY", fullName: "Ilona CZERWONY", code: "0450700000006", price: 750, manufacturer: "POS" },
    { name: "Ilona", color: "RUDY", fullName: "Ilona RUDY", code: "0452300000004", price: 750, manufacturer: "POS" },
    { name: "Inga", color: "NARCICEGI", fullName: "Inga NARCICEGI", code: "0461500000004", price: 750, manufacturer: "POS" },
    { name: "Iwona", color: "CZARNY", fullName: "Iwona CZARNY", code: "0470600000005", price: 1190, manufacturer: "POS" },
    { name: "Iwona", color: "NARCICEGI", fullName: "Iwona NARCICEGI", code: "0471500000003", price: 1190, manufacturer: "POS" },
    { name: "Iwona", color: "GRANATOWY", fullName: "Iwona GRANATOWY", code: "0471100000007", price: 1190, manufacturer: "POS" },
    { name: "Iza", color: "CZERWONY", fullName: "Iza CZERWONY", code: "0480700000003", price: 950, manufacturer: "CAR" },
    { name: "Iza", color: "ŻÓŁTY", fullName: "Iza ŻÓŁTY", code: "0482200000002", price: 950, manufacturer: "CAR" },
    { name: "Iza", color: "BEŻ", fullName: "Iza BEŻ", code: "0480100000009", price: 950, manufacturer: "CAR" },
    { name: "Iza", color: "NIEBIESKI", fullName: "Iza NIEBIESKI", code: "0481600000001", price: 950, manufacturer: "CAR" },
    { name: "Jadwiga", color: "CZERWONY", fullName: "Jadwiga CZERWONY", code: "0490700000002", price: 850, manufacturer: "CAR" },
    { name: "Jadwiga", color: "BEŻ", fullName: "Jadwiga BEŻ", code: "0490100000008", price: 850, manufacturer: "CAR" },
    { name: "Jagoda", color: "CZARNY", fullName: "Jagoda CZARNY", code: "1150600000005", price: 790, manufacturer: "OKS" },
    { name: "Jagoda", color: "BEŻ", fullName: "Jagoda BEŻ", code: "1150100000000", price: 790, manufacturer: "OKS" },
    { name: "Juda", color: "BORDOWY", fullName: "Juda BORDOWY", code: "1170300000006", price: 990, manufacturer: "DOG" },
    { name: "Judyta", color: "BIAŁY", fullName: "Judyta BIAŁY", code: "0520200000001", price: 690, manufacturer: "POS" },
    { name: "Judyta", color: "CZARNY", fullName: "Judyta CZARNY", code: "0520600000007", price: 690, manufacturer: "POS" },
    { name: "Judyta", color: "ŻÓŁTY", fullName: "Judyta ŻÓŁTY", code: "0522200000005", price: 690, manufacturer: "POS" },
    { name: "Judyta", color: "POMARAŃCZOWY", fullName: "Judyta POMARAŃCZOWY", code: "0521800000002", price: 690, manufacturer: "POS" },
    { name: "Karina", color: "CZARNY", fullName: "Karina CZARNY", code: "0560600000003", price: 1390, manufacturer: "MIT" },
    { name: "Karolina", color: "SZARY", fullName: "Karolina SZARY", code: "0572000000002", price: 1790, manufacturer: "CRM" },
    { name: "Karolina", color: "BORDOWY", fullName: "Karolina BORDOWY", code: "0570300000005", price: 1790, manufacturer: "CRM" },
    { name: "Karolina", color: "ECRU", fullName: "Karolina ECRU", code: "0570800000000", price: 1790, manufacturer: "CRM" },
    { name: "Klara", color: "CZARNY", fullName: "Klara CZARNY", code: "0590600000000", price: 850, manufacturer: "POS" },
    { name: "Klara", color: "CZERWONY", fullName: "Klara CZERWONY", code: "0590700000009", price: 850, manufacturer: "POS" },
    { name: "Klara", color: "NIEBIESKI", fullName: "Klara NIEBIESKI", code: "0591600000007", price: 850, manufacturer: "POS" },
    { name: "Larysa", color: "BORDOWY", fullName: "Larysa BORDOWY", code: "1180300000005", price: 690, manufacturer: "CAR" },
    { name: "Larysa", color: "CZARNY", fullName: "Larysa CZARNY", code: "1180600000002", price: 690, manufacturer: "CAR" },
    { name: "Lilia", color: "CZARNY", fullName: "Lilia CZARNY", code: "0670600000009", price: 750, manufacturer: "CAR" },
    { name: "Lucyna", color: "CZARNY", fullName: "Lucyna CZARNY", code: "0700600000003", price: 750, manufacturer: "CAR" },
    { name: "Krystyna", color: "BEŻ", fullName: "Krystyna BEŻ", code: "0620100000009", price: 1090, manufacturer: "OSS" },
    { name: "Ksenia", color: "SZARY", fullName: "Ksenia SZARY", code: "0632000000003", price: 1290, manufacturer: "CAR" },
    { name: "Ksenia II", color: "BEŻ", fullName: "Ksenia II BEŻ", code: "1290100000003", price: 1190, manufacturer: "CAR" },
    { name: "Łucja kołnierz", color: "BEŻ", fullName: "Łucja kołnierz BEŻ", code: "0710100000007", price: 550, manufacturer: "POS" },
    { name: "Magdalena", color: "CZARNY", fullName: "Magdalena CZARNY", code: "0730600000000", price: 750, discount_price: 490, manufacturer: "POS" },
    { name: "Magdalena", color: "OLIWKOWY", fullName: "Magdalena OLIWKOWY", code: "0731700000006", price: 750, discount_price: 550, manufacturer: "POS" },
    { name: "Maja", color: "CZERWONY", fullName: "Maja CZERWONY", code: "0740700000008", price: 650, manufacturer: "MUR" },
    { name: "Malwina", color: "CZARNY", fullName: "Malwina CZARNY", code: "0750600000008", price: 850, manufacturer: "MUR" },
    { name: "Małgorzata", color: "RUDY", fullName: "Małgorzata RUDY", code: "1192300000008", price: 750, manufacturer: "ARS" },
    { name: "Marcelina", color: "CZARNY", fullName: "Marcelina CZARNY", code: "0760600000007", price: 750, manufacturer: "MUR" },
    { name: "Margarita", color: "CZARNY", fullName: "Margarita CZARNY", code: "0770600000006", price: 990, manufacturer: "CAR" },
    { name: "Mariola", color: "CZARNY", fullName: "Mariola CZARNY", code: "0780600000005", price: 990, manufacturer: "CAR" },
    { name: "Mariola", color: "ZIELONY", fullName: "Mariola ZIELONY", code: "0782400000001", price: 990, manufacturer: "CAR" },
    { name: "Mira", color: "CZARNY", fullName: "Mira CZARNY", code: "1200600000007", price: 790, manufacturer: "CAR" },
    { name: "Mona", color: "NIEBIESKI", fullName: "Mona NIEBIESKI", code: "1211600000003", price: 750, manufacturer: "CAR" },
    { name: "Monika", color: "BORDOWY", fullName: "Monika BORDOWY", code: "1220300000008", price: 790, manufacturer: "CAR" },
    { name: "Monika", color: "CZARNY", fullName: "Monika CZARNY", code: "1220600000005", price: 790, manufacturer: "CAR" },
    { name: "Nadia", color: "BEŻ", fullName: "Nadia BEŻ", code: "1230100000009", price: 890, manufacturer: "CAR" },
    { name: "Nadia", color: "SZARY", fullName: "Nadia SZARY", code: "1232000000004", price: 890, manufacturer: "CAR" },
    { name: "Nina", color: "SZARY", fullName: "Nina SZARY", code: "0862000000004", price: 850, manufacturer: "CAT" },
    { name: "Oda", color: "CZARNY", fullName: "Oda CZARNY", code: "1240600000003", price: 750, manufacturer: "CAT" },
    { name: "Olimpia", color: "!NIEOKREŚLONY", fullName: "Olimpia !NIEOKREŚLONY", code: "0890000000007", price: 650, manufacturer: "CAT" },
    { name: "Oktawia", color: "ECRU", fullName: "Oktawia ECRU", code: "0870800000001", price: 750, manufacturer: "CAR" },
    { name: "Otylia", color: "CZARNY", fullName: "Otylia CZARNY", code: "0900600000007", price: 890, manufacturer: "BAR" },
    { name: "Patrycja", color: "CZARNY", fullName: "Patrycja CZARNY", code: "0920600000005", price: 750, manufacturer: "POS" },
    { name: "Patrycja", color: "CZERWONY", fullName: "Patrycja CZERWONY", code: "0920700000004", price: 750, manufacturer: "POS" },
    { name: "Patrycja", color: "BRĄZOWY", fullName: "Patrycja BRĄZOWY", code: "0920400000007", price: 750, manufacturer: "POS" },
    { name: "Patrycja", color: "OLIWKOWY", fullName: "Patrycja OLIWKOWY", code: "0921700000001", price: 750, manufacturer: "POS" },
    { name: "Patrycja", color: "ZIELONY", fullName: "Patrycja ZIELONY", code: "0922400000001", price: 750, manufacturer: "POS" },
    { name: "Paula", color: "SZARY", fullName: "Paula SZARY", code: "0932000000004", price: 1190, manufacturer: "MUR" },
    { name: "Pola", color: "CZARNY", fullName: "Pola CZARNY", code: "0970600000000", price: 750, manufacturer: "POS" },
    { name: "Pola", color: "BEŻ", fullName: "Pola BEŻ", code: "0970100000005", price: 750, manufacturer: "POS" },
    { name: "Rebeka", color: "KAKAO", fullName: "Rebeka KAKAO", code: "0981200000000", price: 950, manufacturer: "DOG" },
    { name: "Regina", color: "KAKAO", fullName: "Regina KAKAO", code: "0991200000009", price: 1090, manufacturer: "ROS" },
    { name: "Renata", color: "CZARNY", fullName: "Renata CZARNY", code: "1000600000003", price: 1190, manufacturer: "CAR" },
    { name: "Renata", color: "SZARY", fullName: "Renata SZARY", code: "1002000000003", price: 1190, manufacturer: "CAR" },
    { name: "Róża", color: "CZARNY", fullName: "Róża CZARNY", code: "1010600000002", price: 750, manufacturer: "POS" },
    { name: "Róża", color: "RUDY", fullName: "Róża RUDY", code: "1012300000009", price: 750, manufacturer: "POS" },
    { name: "Salomea", color: "CZARNY", fullName: "Salomea CZARNY", code: "1250600000002", price: 950, manufacturer: "CAT" },
    { name: "Samanta", color: "CZERWONY", fullName: "Samanta CZERWONY", code: "1020700000000", price: 750, manufacturer: "CAR" },
    { name: "Sonia 3 długa bez kaptura", color: "CZARNY", fullName: "Sonia 3 długa bez kaptura CZARNY", code: "1060600000007", price: 1150, manufacturer: "DOG" },
    { name: "Sonia 1", color: "CZERWONY", fullName: "Sonia 1 CZERWONY", code: "1040700000008", price: 990, manufacturer: "CAR" },
    { name: "Sonia 2 długa kaptur", color: "GRANATOWY", fullName: "Sonia 2 długa kaptur GRANATOWY", code: "1051100000000", price: 1190, manufacturer: "DOG" },
    { name: "Sonia 1", color: "GRANATOWY", fullName: "Sonia 1 GRANATOWY", code: "1041100000001", price: 990, manufacturer: "DOG" },
    { name: "Teresa", color: "CZARNY", fullName: "Teresa CZARNY", code: "6470600000009", price: 1250, manufacturer: "OKS" },
    { name: "Ula", color: "CZERWONY", fullName: "Ula CZERWONY", code: "1090700000003", price: 750, manufacturer: "CAR" },
    { name: "Weronika", color: "CZARNY", fullName: "Weronika CZARNY", code: "1270600000000", price: 750, manufacturer: "CAR" },
    { name: "Zuzanna", color: "CZARNY", fullName: "Zuzanna CZARNY", code: "1110600000009", price: 1490, manufacturer: "MIT" },
    { name: "Zyta", color: "BRĄZOWY", fullName: "Zyta BRĄZOWY", code: "1120400000000", price: 1490, manufacturer: "OKS" },
    { name: "Żaneta", color: "CZARNY", fullName: "Żaneta CZARNY", code: "1130600000007", price: 1290, manufacturer: "MAY" },
    { name: "Żaneta", color: "BEŻ", fullName: "Żaneta BEŻ", code: "1130100000002", price: 1290, manufacturer: "MAY" },
    { name: "Tina", color: "CZARNY", fullName: "Tina CZARNY", code: "1080600000005", price: 1250, manufacturer: "POS" }
];

// Mapowanie producentów (skróty na pełne nazwy)
const manufacturerMapping = {
    'POS': 'Poseidon',
    'OSS': 'Ossira',
    'CAR': 'Carmen',
    'MUR': 'Murano',
    'SAG': 'Sagittarius',
    'DOG': 'Dogma',
    'CAT': 'Catania',
    'OKS': 'Oksana',
    'CRM': 'Cremona',
    'MIT': 'Mitis',
    'ARS': 'Arsenal',
    'BAR': 'Bartex',
    'ROS': 'Rosito',
    'MAY': 'Maya'
};

async function addWomenLeatherJackets() {
    try {
        // Używamy tej samej bazy co aplikacja
        const config = require('./app/config');
        await mongoose.connect(config.database);
        console.log('✅ Połączono z MongoDB Atlas');

        // 1. Sprawdź/utwórz subcategory "Kurtka skórzana damska"
        let subcategory = await SubcategoryCoats.findOne({ 
            Kat_1_Opis_1: 'Kurtka skórzana damska' 
        });

        if (!subcategory) {
            console.log('📝 Tworzenie subcategory "Kurtka skórzana damska"...');
            
            // Znajdź najwyższy Kat_1_Kod_1 i dodaj 1
            const existingSubcategories = await SubcategoryCoats.find().sort({ Kat_1_Kod_1: 1 });
            console.log('🔍 Istniejące subcategories:', existingSubcategories.map(s => ({ kod: s.Kat_1_Kod_1, opis: s.Kat_1_Opis_1 })));
            
            let maxCode = 0;
            existingSubcategories.forEach(sub => {
                const code = parseInt(sub.Kat_1_Kod_1);
                if (!isNaN(code) && code > maxCode) {
                    maxCode = code;
                }
            });
            
            const newCode = (maxCode + 1).toString();
            console.log(`📝 Używam nowego kodu: ${newCode}`);
            
            subcategory = new SubcategoryCoats({
                _id: new mongoose.Types.ObjectId(),
                Kat_1_Kod_1: newCode,
                Kat_1_Opis_1: 'Kurtka skórzana damska',
                Plec: 'D'
            });
            await subcategory.save();
            console.log('✅ Utworzona subcategory:', subcategory);
        } else {
            console.log('✅ Subcategory już istnieje:', subcategory);
        }

        // 2. Dodaj wszystkie kurtki
        let addedCount = 0;
        let skippedCount = 0;

        for (const jacket of jacketsData) {
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

                // Znajdź/utwórz kolor
                let color = await Color.findOne({ Kol_Opis: jacket.color });
                if (!color) {
                    console.log(`📝 Tworzenie koloru: ${jacket.color}`);
                    color = new Color({
                        _id: new mongoose.Types.ObjectId(),
                        Kol_Kod: String(Math.floor(Math.random() * 99) + 1).padStart(2, '0'),
                        Kol_Opis: jacket.color
                    });
                    await color.save();
                }

                // Znajdź/utwórz stock (nazwa modelu)
                let stock = await Stock.findOne({ Tow_Opis: jacket.name });
                if (!stock) {
                    console.log(`📝 Tworzenie stock: ${jacket.name}`);
                    stock = new Stock({
                        _id: new mongoose.Types.ObjectId(),
                        Tow_Kod: String(Math.floor(Math.random() * 999) + 1).padStart(3, '0'),
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

        console.log('\n📊 PODSUMOWANIE:');
        console.log(`✅ Dodano produktów: ${addedCount}`);
        console.log(`⚠️ Pominięto (już istnieją): ${skippedCount}`);
        console.log(`📝 Łącznie przetworzono: ${jacketsData.length}`);

    } catch (error) {
        console.error('❌ Błąd:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Rozłączono z MongoDB');
    }
}

// Uruchom skrypt
addWomenLeatherJackets().catch(console.error);