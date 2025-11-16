const mongoose = require('mongoose');
const Goods = require('./app/db/models/goods');
const Color = require('./app/db/models/color');
const Category = require('./app/db/models/category');
const SubcategoryCoats = require('./app/db/models/subcategoryCoats');
const Stock = require('./app/db/models/stock');

// Połączenie z bazą danych
mongoose.connect('mongodb+srv://wbukowski1985:3VX4byVnTO2CFRPc@bukowskiapp.emdzg.mongodb.net/BukowskiApp?retryWrites=true&w=majority&appName=BukowskiApp').then(async () => {
    console.log('=== IMPORT KURTEK DAMSKICH LICÓWKA ===');

    // Dane produktów z tabeli
    const leatherJacketsData = [
        { lp: 1, product: "Ada", color: "CZERWONY", fullName: "Ada CZERWONY", barcode: "0010700000002", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 1390, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 2, product: "Adela", color: "CZARNY", fullName: "Adela CZARNY", barcode: "0020600000002", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 690, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 3, product: "Adela", color: "ECRU", fullName: "Adela ECRU", barcode: "0020800000000", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 690, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 4, product: "Adela", color: "GRANATOWY", fullName: "Adela GRANATOWY", barcode: "0021100000004", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 690, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 5, product: "Adela", color: "CHABROWY", fullName: "Adela CHABROWY", barcode: "0020500000003", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 690, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 6, product: "Adela", color: "ZIELONY", fullName: "Adela ZIELONY", barcode: "0022400000008", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 690, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 7, product: "Adela", color: "ŻÓŁTY", fullName: "Adela ŻÓŁTY", barcode: "0022200000000", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 690, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 8, product: "Aisha", color: "BRĄZOWY", fullName: "Aisha BRĄZOWY", barcode: "0050400000001", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "OSS", price: 950, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 9, product: "Aisha", color: "CZARNY", fullName: "Aisha CZARNY", barcode: "0050600000009", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "OSS", price: 950, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 10, product: "Alicja", color: "CZERWONY", fullName: "Alicja CZERWONY", barcode: "0070700000006", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "CAR", price: 1290, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 11, product: "Alina", color: "CZARNY", fullName: "Alina CZARNY", barcode: "0080600000006", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "MUR", price: 1050, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 12, product: "Amanda", color: "CZARNY", fullName: "Amanda CZARNY", barcode: "0100600000001", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "SAG", price: 690, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 13, product: "Aneta II z plisą", color: "CZARNY", fullName: "Aneta II z plisą CZARNY", barcode: "0140600000007", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 750, discountPrice: 690, exceptions: "5XL=750", gender: "D" },
        { lp: 14, product: "Aneta", color: "CZARNY", fullName: "Aneta CZARNY", barcode: "0130600000008", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 750, discountPrice: 690, exceptions: "5XL=750", gender: "D" },
        { lp: 15, product: "Aneta II z plisą", color: "CZERWONY", fullName: "Aneta II z plisą CZERWONY", barcode: "0140700000006", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 750, discountPrice: 690, exceptions: "5XL=750", gender: "D" },
        { lp: 16, product: "Aneta II z plisą", color: "GRANATOWY", fullName: "Aneta II z plisą GRANATOWY", barcode: "0141100000009", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 750, discountPrice: 690, exceptions: "5XL=750", gender: "D" },
        { lp: 17, product: "Aneta", color: "KAKAO", fullName: "Aneta KAKAO", barcode: "0131200000009", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 750, discountPrice: 690, exceptions: "5XL=749", gender: "D" },
        { lp: 18, product: "Aneta", color: "MUTON SZARY", fullName: "Aneta MUTON SZARY", barcode: "0131400000007", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 750, discountPrice: 690, exceptions: "5XL=750", gender: "D" },
        { lp: 19, product: "Aneta II z plisą", color: "ŻÓŁTY", fullName: "Aneta II z plisą ŻÓŁTY", barcode: "0142200000005", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 750, discountPrice: 690, exceptions: "5XL=750", gender: "D" },
        { lp: 20, product: "Aniela", color: "BRĄZOWY", fullName: "Aniela BRĄZOWY", barcode: "1280400000001", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "SAG", price: 1190, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 21, product: "Aniela", color: "CZARNY", fullName: "Aniela CZARNY", barcode: "1280600000009", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "SAG", price: 1190, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 22, product: "Anita", color: "CZARNY", fullName: "Anita CZARNY", barcode: "1140600000006", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "CAR", price: 1090, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 23, product: "Barbara", color: "CZARNY", fullName: "Barbara CZARNY", barcode: "0160600000005", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "CAR", price: 1390, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 24, product: "Beata", color: "CZARNY", fullName: "Beata CZARNY", barcode: "0170600000004", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "CAR", price: 1190, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 25, product: "Bella", color: "BORDOWY", fullName: "Bella BORDOWY", barcode: "0180300000006", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "MUR", price: 990, discountPrice: 790, exceptions: "", gender: "D" },
        { lp: 26, product: "Bona", color: "CZARNY", fullName: "Bona CZARNY", barcode: "0190600000002", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "DOG", price: 1090, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 27, product: "Cecylia", color: "BEŻ", fullName: "Cecylia BEŻ", barcode: "0210100000002", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "DOG", price: 890, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 28, product: "Dagmara", color: "CZARNY", fullName: "Dagmara CZARNY", barcode: "0220600000006", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "CAR", price: 1290, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 29, product: "Danuta", color: "SZARY", fullName: "Danuta SZARY", barcode: "0232000000005", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 650, discountPrice: 390, exceptions: "", gender: "D" },
        { lp: 30, product: "Dominika", color: "CZARNY", fullName: "Dominika CZARNY", barcode: "0270600000001", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 750, discountPrice: 690, exceptions: "", gender: "D" },
        { lp: 31, product: "Dominika", color: "KAKAO", fullName: "Dominika KAKAO", barcode: "0271200000002", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 750, discountPrice: 690, exceptions: "", gender: "D" },
        { lp: 32, product: "Edyta", color: "CZARNY", fullName: "Edyta CZARNY", barcode: "0290600000009", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 750, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 33, product: "Edyta", color: "NARCICEGI", fullName: "Edyta NARCICEGI", barcode: "0291500000007", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 750, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 34, product: "Edyta", color: "ŻÓŁTY", fullName: "Edyta ŻÓŁTY", barcode: "0292200000007", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 750, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 35, product: "Elena", color: "CZARNY", fullName: "Elena CZARNY", barcode: "0300600000005", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "OSS", price: 1390, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 36, product: "Emilia", color: "CZARNY", fullName: "Emilia CZARNY", barcode: "0340600000001", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "SAG", price: 650, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 37, product: "Galina", color: "CZARNY", fullName: "Galina CZARNY", barcode: "0400600000002", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "DOG", price: 850, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 38, product: "Grażyna", color: "GRANATOWY", fullName: "Grażyna GRANATOWY", barcode: "0411100000003", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 850, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 39, product: "Grażyna", color: "BORDOWY", fullName: "Grażyna BORDOWY", barcode: "0410300000004", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 850, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 40, product: "Henia", color: "CZARNY", fullName: "Henia CZARNY", barcode: "0430600000009", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "OSS", price: 890, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 41, product: "Henia", color: "NIEBIESKI", fullName: "Henia NIEBIESKI", barcode: "0431600000006", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "OSS", price: 890, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 42, product: "Henia", color: "BEŻ", fullName: "Henia BEŻ", barcode: "0430100000004", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "OSS", price: 890, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 43, product: "Honorata", color: "BIAŁY", fullName: "Honorata BIAŁY", barcode: "0440200000002", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 690, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 44, product: "Honorata", color: "CZERWONY", fullName: "Honorata CZERWONY", barcode: "0440700000007", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 690, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 45, product: "Honorata", color: "POMARAŃCZOWY", fullName: "Honorata POMARAŃCZOWY", barcode: "0441800000003", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 690, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 46, product: "Honorata", color: "CZARNY", fullName: "Honorata CZARNY", barcode: "0440600000008", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 690, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 47, product: "Ilona", color: "BEŻ", fullName: "Ilona BEŻ", barcode: "0450100000002", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 750, discountPrice: null, exceptions: "4XL=800, 5XL=800", gender: "D" },
        { lp: 48, product: "Ilona", color: "CZARNY", fullName: "Ilona CZARNY", barcode: "0450600000007", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 750, discountPrice: null, exceptions: "4XL=800, 5XL=800", gender: "D" },
        { lp: 49, product: "Ilona", color: "CZERWONY", fullName: "Ilona CZERWONY", barcode: "0450700000006", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 750, discountPrice: null, exceptions: "4XL=800, 5XL=800", gender: "D" },
        { lp: 50, product: "Ilona", color: "RUDY", fullName: "Ilona RUDY", barcode: "0452300000004", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 750, discountPrice: null, exceptions: "4XL=800, 5XL=800", gender: "D" },
        { lp: 51, product: "Inga", color: "NARCICEGI", fullName: "Inga NARCICEGI", barcode: "0461500000004", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 750, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 52, product: "Iwona", color: "CZARNY", fullName: "Iwona CZARNY", barcode: "0470600000005", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 1190, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 53, product: "Iwona", color: "NARCICEGI", fullName: "Iwona NARCICEGI", barcode: "0471500000003", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 1190, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 54, product: "Iwona", color: "GRANATOWY", fullName: "Iwona GRANATOWY", barcode: "0471100000007", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 1190, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 55, product: "Iza", color: "CZERWONY", fullName: "Iza CZERWONY", barcode: "0480700000003", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "CAR", price: 950, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 56, product: "Iza", color: "ŻÓŁTY", fullName: "Iza ŻÓŁTY", barcode: "0482200000002", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "CAR", price: 950, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 57, product: "Iza", color: "BEŻ", fullName: "Iza BEŻ", barcode: "0480100000009", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "CAR", price: 950, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 58, product: "Iza", color: "NIEBIESKI", fullName: "Iza NIEBIESKI", barcode: "0481600000001", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "CAR", price: 950, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 59, product: "Jadwiga", color: "CZERWONY", fullName: "Jadwiga CZERWONY", barcode: "0490700000002", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "CAR", price: 850, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 60, product: "Jadwiga", color: "BEŻ", fullName: "Jadwiga BEŻ", barcode: "0490100000008", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "CAR", price: 850, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 61, product: "Jagoda", color: "CZARNY", fullName: "Jagoda CZARNY", barcode: "1150600000005", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "OKS", price: 790, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 62, product: "Jagoda", color: "BEŻ", fullName: "Jagoda BEŻ", barcode: "1150100000000", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "OKS", price: 790, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 63, product: "Juda", color: "BORDOWY", fullName: "Juda BORDOWY", barcode: "1170300000006", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "DOG", price: 990, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 64, product: "Judyta", color: "BIAŁY", fullName: "Judyta BIAŁY", barcode: "0520200000001", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 690, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 65, product: "Judyta", color: "CZARNY", fullName: "Judyta CZARNY", barcode: "0520600000007", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 690, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 66, product: "Judyta", color: "ŻÓŁTY", fullName: "Judyta ŻÓŁTY", barcode: "0522200000005", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 690, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 67, product: "Judyta", color: "POMARAŃCZOWY", fullName: "Judyta POMARAŃCZOWY", barcode: "0521800000002", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 690, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 68, product: "Karina", color: "CZARNY", fullName: "Karina CZARNY", barcode: "0560600000003", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "MIT", price: 1390, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 69, product: "Karolina", color: "SZARY", fullName: "Karolina SZARY", barcode: "0572000000002", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "CRM", price: 1790, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 70, product: "Karolina", color: "BORDOWY", fullName: "Karolina BORDOWY", barcode: "0570300000005", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "CRM", price: 1790, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 71, product: "Karolina", color: "ECRU", fullName: "Karolina ECRU", barcode: "0570800000000", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "CRM", price: 1790, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 72, product: "Klara", color: "CZARNY", fullName: "Klara CZARNY", barcode: "0590600000000", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 850, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 73, product: "Klara", color: "CZERWONY", fullName: "Klara CZERWONY", barcode: "0590700000009", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 850, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 74, product: "Klara", color: "NIEBIESKI", fullName: "Klara NIEBIESKI", barcode: "0591600000007", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 850, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 75, product: "Larysa", color: "BORDOWY", fullName: "Larysa BORDOWY", barcode: "1180300000005", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "CAR", price: 690, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 76, product: "Larysa", color: "CZARNY", fullName: "Larysa CZARNY", barcode: "1180600000002", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "CAR", price: 690, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 77, product: "Lilia", color: "CZARNY", fullName: "Lilia CZARNY", barcode: "0670600000009", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "CAR", price: 750, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 78, product: "Lucyna", color: "CZARNY", fullName: "Lucyna CZARNY", barcode: "0700600000003", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "CAR", price: 750, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 79, product: "Krystyna", color: "BEŻ", fullName: "Krystyna BEŻ", barcode: "0620100000009", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "OSS", price: 1090, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 80, product: "Ksenia", color: "SZARY", fullName: "Ksenia SZARY", barcode: "0632000000003", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "CAR", price: 1290, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 81, product: "Ksenia II", color: "BEŻ", fullName: "Ksenia II BEŻ", barcode: "1290100000003", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "CAR", price: 1190, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 82, product: "Łucja kołnierz", color: "BEŻ", fullName: "Łucja kołnierz BEŻ", barcode: "0710100000007", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 550, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 83, product: "Magdalena", color: "CZARNY", fullName: "Magdalena CZARNY", barcode: "0730600000000", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 750, discountPrice: 490, exceptions: "", gender: "D" },
        { lp: 84, product: "Magdalena", color: "OLIWKOWY", fullName: "Magdalena OLIWKOWY", barcode: "0731700000006", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 750, discountPrice: 550, exceptions: "", gender: "D" },
        { lp: 85, product: "Maja", color: "CZERWONY", fullName: "Maja CZERWONY", barcode: "0740700000008", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "MUR", price: 650, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 86, product: "Malwina", color: "CZARNY", fullName: "Malwina CZARNY", barcode: "0750600000008", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "MUR", price: 850, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 87, product: "Małgorzata", color: "RUDY", fullName: "Małgorzata RUDY", barcode: "1192300000008", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "ARS", price: 750, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 88, product: "Marcelina", color: "CZARNY", fullName: "Marcelina CZARNY", barcode: "0760600000007", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "MUR", price: 750, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 89, product: "Margarita", color: "CZARNY", fullName: "Margarita CZARNY", barcode: "0770600000006", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "CAR", price: 990, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 90, product: "Mariola", color: "CZARNY", fullName: "Mariola CZARNY", barcode: "0780600000005", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "CAR", price: 990, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 91, product: "Mariola", color: "ZIELONY", fullName: "Mariola ZIELONY", barcode: "0782400000001", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "CAR", price: 990, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 92, product: "Mira", color: "CZARNY", fullName: "Mira CZARNY", barcode: "1200600000007", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "CAR", price: 790, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 93, product: "Mona", color: "NIEBIESKI", fullName: "Mona NIEBIESKI", barcode: "1211600000003", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "CAR", price: 750, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 94, product: "Monika", color: "BORDOWY", fullName: "Monika BORDOWY", barcode: "1220300000008", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "CAR", price: 790, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 95, product: "Monika", color: "CZARNY", fullName: "Monika CZARNY", barcode: "1220600000005", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "CAR", price: 790, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 96, product: "Nadia", color: "BEŻ", fullName: "Nadia BEŻ", barcode: "1230100000009", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "CAR", price: 890, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 97, product: "Nadia", color: "SZARY", fullName: "Nadia SZARY", barcode: "1232000000004", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "CAR", price: 890, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 98, product: "Nina", color: "SZARY", fullName: "Nina SZARY", barcode: "0862000000004", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "CAT", price: 850, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 99, product: "Oda", color: "CZARNY", fullName: "Oda CZARNY", barcode: "1240600000003", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "CAT", price: 750, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 100, product: "Olimpia", color: "!NIEOKREŚLONY", fullName: "Olimpia !NIEOKREŚLONY", barcode: "0890000000007", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "CAT", price: 650, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 101, product: "Oktawia", color: "ECRU", fullName: "Oktawia ECRU", barcode: "0870800000001", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "CAR", price: 750, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 102, product: "Otylia", color: "CZARNY", fullName: "Otylia CZARNY", barcode: "0900600000007", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "BAR", price: 890, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 103, product: "Patrycja", color: "CZARNY", fullName: "Patrycja CZARNY", barcode: "0920600000005", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 750, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 104, product: "Patrycja", color: "CZERWONY", fullName: "Patrycja CZERWONY", barcode: "0920700000004", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 750, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 105, product: "Patrycja", color: "BRĄZOWY", fullName: "Patrycja BRĄZOWY", barcode: "0920400000007", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 750, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 106, product: "Patrycja", color: "OLIWKOWY", fullName: "Patrycja OLIWKOWY", barcode: "0921700000001", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 750, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 107, product: "Patrycja", color: "ZIELONY", fullName: "Patrycja ZIELONY", barcode: "0922400000001", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 750, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 108, product: "Paula", color: "SZARY", fullName: "Paula SZARY", barcode: "0932000000004", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "MUR", price: 1190, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 109, product: "Pola", color: "CZARNY", fullName: "Pola CZARNY", barcode: "0970600000000", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 750, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 110, product: "Pola", color: "BEŻ", fullName: "Pola BEŻ", barcode: "0970100000005", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 750, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 111, product: "Rebeka", color: "KAKAO", fullName: "Rebeka KAKAO", barcode: "0981200000000", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "DOG", price: 950, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 112, product: "Regina", color: "KAKAO", fullName: "Regina KAKAO", barcode: "0991200000009", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "ROS", price: 1090, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 113, product: "Renata", color: "CZARNY", fullName: "Renata CZARNY", barcode: "1000600000003", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "CAR", price: 1190, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 114, product: "Renata", color: "SZARY", fullName: "Renata SZARY", barcode: "1002000000003", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "CAR", price: 1190, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 115, product: "Róża", color: "CZARNY", fullName: "Róża CZARNY", barcode: "1010600000002", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 750, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 116, product: "Róża", color: "RUDY", fullName: "Róża RUDY", barcode: "1012300000009", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 750, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 117, product: "Salomea", color: "CZARNY", fullName: "Salomea CZARNY", barcode: "1250600000002", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "CAT", price: 950, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 118, product: "Samanta", color: "CZERWONY", fullName: "Samanta CZERWONY", barcode: "1020700000000", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "CAR", price: 750, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 119, product: "Sonia 3 długa bez kaptura", color: "CZARNY", fullName: "Sonia 3 długa bez kaptura CZARNY", barcode: "1060600000007", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "DOG", price: 1150, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 120, product: "Sonia 1", color: "CZERWONY", fullName: "Sonia 1 CZERWONY", barcode: "1040700000008", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "CAR", price: 990, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 121, product: "Sonia 2 długa kaptur", color: "GRANATOWY", fullName: "Sonia 2 długa kaptur GRANATOWY", barcode: "1051100000000", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "DOG", price: 1190, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 122, product: "Sonia 1", color: "GRANATOWY", fullName: "Sonia 1 GRANATOWY", barcode: "1041100000001", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "DOG", price: 990, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 123, product: "Teresa", color: "CZARNY", fullName: "Teresa CZARNY", barcode: "6470600000009", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "OKS", price: 1250, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 124, product: "Ula", color: "CZERWONY", fullName: "Ula CZERWONY", barcode: "1090700000003", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "CAR", price: 750, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 125, product: "Weronika", color: "CZARNY", fullName: "Weronika CZARNY", barcode: "1270600000000", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "CAR", price: 750, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 126, product: "Zuzanna", color: "CZARNY", fullName: "Zuzanna CZARNY", barcode: "1110600000009", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "MIT", price: 1490, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 127, product: "Zyta", color: "BRĄZOWY", fullName: "Zyta BRĄZOWY", barcode: "1120400000000", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "OKS", price: 1490, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 128, product: "Żaneta", color: "CZARNY", fullName: "Żaneta CZARNY", barcode: "1130600000007", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "MAY", price: 1290, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 129, product: "Żaneta", color: "BEŻ", fullName: "Żaneta BEŻ", barcode: "1130100000002", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "MAY", price: 1290, discountPrice: null, exceptions: "", gender: "D" },
        { lp: 130, product: "Tina", color: "CZARNY", fullName: "Tina CZARNY", barcode: "1080600000005", category: "Kurtki kożuchy futra", subcategory: "Kurtka damska licówka", group: "POS", price: 1250, discountPrice: null, exceptions: "", gender: "D" }
    ];

    try {
        // Sprawdź kategorie
        console.log('Sprawdzanie kategorii...');
        let category = await Category.findOne({ Kat_1_Opis_1: 'Kurtki kożuchy futra' });
        if (!category) {
            category = new Category({
                _id: new mongoose.Types.ObjectId(),
                Kat_1_Kod_1: 'KKF001',
                Kat_1_Opis_1: 'Kurtki kożuchy futra',
                Plec: 'D'
            });
            await category.save();
            console.log('✅ Utworzono kategorię: Kurtki kożuchy futra');
        }

        // Sprawdź podkategorię
        console.log('Sprawdzanie podkategorii...');
        let subcategory = await SubcategoryCoats.findOne({ Subcat_Opis_1: 'Kurtka damska licówka' });
        if (!subcategory) {
            subcategory = new SubcategoryCoats({
                _id: new mongoose.Types.ObjectId(),
                Subcat_Kod_1: 'KDL001',
                Subcat_Opis_1: 'Kurtka damska licówka'
            });
            await subcategory.save();
            console.log('✅ Utworzono podkategorię: Kurtka damska licówka');
        }

        // Sprawdź wszystkie kolory
        const uniqueColors = [...new Set(leatherJacketsData.map(item => item.color))];
        console.log('Sprawdzanie kolorów...', uniqueColors);

        for (const colorName of uniqueColors) {
            let color = await Color.findOne({ Kol_Opis_1: colorName });
            if (!color) {
                const colorCode = String(uniqueColors.indexOf(colorName) + 1).padStart(2, '0');
                color = new Color({
                    _id: new mongoose.Types.ObjectId(),
                    Kol_Kod: colorCode,
                    Kol_Opis_1: colorName
                });
                await color.save();
                console.log(`✅ Utworzono kolor: ${colorName} (kod: ${colorCode})`);
            }
        }

        // Import produktów
        console.log('Rozpoczynam import produktów...');
        let importCount = 0;
        let skipCount = 0;

        for (const productData of leatherJacketsData) {
            // Sprawdź czy produkt już istnieje
            const existingProduct = await Goods.findOne({ fullName: productData.fullName });
            if (existingProduct) {
                console.log(`⚠️  Pominięto: ${productData.fullName} (już istnieje)`);
                skipCount++;
                continue;
            }

            // Znajdź kolor
            const color = await Color.findOne({ Kol_Opis_1: productData.color });
            if (!color) {
                console.log(`❌ Błąd: Nie znaleziono koloru ${productData.color}`);
                continue;
            }

            // Utwórz nowy produkt
            const newProduct = new Goods({
                _id: new mongoose.Types.ObjectId(),
                fullName: productData.fullName,
                code: productData.barcode,
                price: productData.price,
                discount_price: productData.discountPrice,
                category: productData.category,
                subcategory: subcategory._id,
                color: color._id,
                Plec: productData.gender,
                barcode: productData.barcode,
                symbol: productData.group || '',
                picture: productData.fullName + '.jpg' // Domyślna nazwa zdjęcia
            });

            await newProduct.save();
            console.log(`✅ Dodano: ${productData.fullName}`);
            importCount++;
        }

        console.log(`\n=== PODSUMOWANIE IMPORTU ===`);
        console.log(`✅ Zaimportowano: ${importCount} produktów`);
        console.log(`⚠️  Pominięto: ${skipCount} produktów (już istniały)`);
        console.log(`📊 Łącznie produktów: ${leatherJacketsData.length}`);

    } catch (error) {
        console.error('❌ Błąd podczas importu:', error);
    } finally {
        mongoose.connection.close();
        console.log('Połączenie z bazą danych zamknięte.');
    }
}).catch(err => {
    console.error('❌ Błąd połączenia z bazą danych:', err);
});