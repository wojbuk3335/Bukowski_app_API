const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://wbukowski1985:3VX4byVnTO2CFRPc@bukowskiapp.emdzg.mongodb.net/BukowskiApp?retryWrites=true&w=majority&appName=BukowskiApp';

async function addWomenVests() {
    const client = new MongoClient(uri);
    
    try {
        await client.connect();
        console.log('Połączono z MongoDB');
        
        const db = client.db('BukowskiApp');
        const collection = db.collection('goods');
        
        // 9 pozostałych kamizelek damskich z kożucha z różnymi kolorami
        const womenVests = [
            {
                "Artykul": "Kamizelka damska z kożucha",
                "Kolor": "BRĄZOWY",
                "fullName": "Kamizelka damska z kożucha BRĄZOWY",
                "code": "6200600000003",
                "price": 420,
                "discount_price": 0,
                "category": "Kurtki kożuchy futra",
                "subcategory": "Kamizelka damska z kożcuha",
                "Plec": "D",
                "picture": "",
                "priceExceptions": [],
                "symbol": "",
                "sellingPoint": "",
                "barcode": "",
                "priceKarpacz": 0,
                "discount_priceKarpacz": 0,
                "priceExceptionsKarpacz": [],
                "isSelectedForPrint": false,
                "rowColor": "",
                "rowBackgroundColor": ""
            },
            {
                "Artykul": "Kamizelka damska z kożucha",
                "Kolor": "RUDY",
                "fullName": "Kamizelka damska z kożucha RUDY",
                "code": "6200600000004",
                "price": 420,
                "discount_price": 0,
                "category": "Kurtki kożuchy futra",
                "subcategory": "Kamizelka damska z kożcuha",
                "Plec": "D",
                "picture": "",
                "priceExceptions": [],
                "symbol": "",
                "sellingPoint": "",
                "barcode": "",
                "priceKarpacz": 0,
                "discount_priceKarpacz": 0,
                "priceExceptionsKarpacz": [],
                "isSelectedForPrint": false,
                "rowColor": "",
                "rowBackgroundColor": ""
            },
            {
                "Artykul": "Kamizelka damska z kożucha",
                "Kolor": "SZARY",
                "fullName": "Kamizelka damska z kożucha SZARY",
                "code": "6200600000005",
                "price": 420,
                "discount_price": 0,
                "category": "Kurtki kożuchy futra",
                "subcategory": "Kamizelka damska z kożcuha",
                "Plec": "D",
                "picture": "",
                "priceExceptions": [],
                "symbol": "",
                "sellingPoint": "",
                "barcode": "",
                "priceKarpacz": 0,
                "discount_priceKarpacz": 0,
                "priceExceptionsKarpacz": [],
                "isSelectedForPrint": false,
                "rowColor": "",
                "rowBackgroundColor": ""
            },
            {
                "Artykul": "Kamizelka damska z kożucha",
                "Kolor": "NATURALNY",
                "fullName": "Kamizelka damska z kożucha NATURALNY",
                "code": "6200600000006",
                "price": 420,
                "discount_price": 0,
                "category": "Kurtki kożuchy futra",
                "subcategory": "Kamizelka damska z kożcuha",
                "Plec": "D",
                "picture": "",
                "priceExceptions": [],
                "symbol": "",
                "sellingPoint": "",
                "barcode": "",
                "priceKarpacz": 0,
                "discount_priceKarpacz": 0,
                "priceExceptionsKarpacz": [],
                "isSelectedForPrint": false,
                "rowColor": "",
                "rowBackgroundColor": ""
            },
            {
                "Artykul": "Kamizelka damska z kożucha",
                "Kolor": "BEŻOWY",
                "fullName": "Kamizelka damska z kożucha BEŻOWY",
                "code": "6200600000007",
                "price": 420,
                "discount_price": 0,
                "category": "Kurtki kożuchy futra",
                "subcategory": "Kamizelka damska z kożcuha",
                "Plec": "D",
                "picture": "",
                "priceExceptions": [],
                "symbol": "",
                "sellingPoint": "",
                "barcode": "",
                "priceKarpacz": 0,
                "discount_priceKarpacz": 0,
                "priceExceptionsKarpacz": [],
                "isSelectedForPrint": false,
                "rowColor": "",
                "rowBackgroundColor": ""
            },
            {
                "Artykul": "Kamizelka damska z kożucha",
                "Kolor": "BIAŁY",
                "fullName": "Kamizelka damska z kożucha BIAŁY",
                "code": "6200600000008",
                "price": 420,
                "discount_price": 0,
                "category": "Kurtki kożuchy futra",
                "subcategory": "Kamizelka damska z kożcuha",
                "Plec": "D",
                "picture": "",
                "priceExceptions": [],
                "symbol": "",
                "sellingPoint": "",
                "barcode": "",
                "priceKarpacz": 0,
                "discount_priceKarpacz": 0,
                "priceExceptionsKarpacz": [],
                "isSelectedForPrint": false,
                "rowColor": "",
                "rowBackgroundColor": ""
            },
            {
                "Artykul": "Kamizelka damska z kożucha",
                "Kolor": "KREMOWY",
                "fullName": "Kamizelka damska z kożucha KREMOWY",
                "code": "6200600000009",
                "price": 420,
                "discount_price": 0,
                "category": "Kurtki kożuchy futra",
                "subcategory": "Kamizelka damska z kożcuha",
                "Plec": "D",
                "picture": "",
                "priceExceptions": [],
                "symbol": "",
                "sellingPoint": "",
                "barcode": "",
                "priceKarpacz": 0,
                "discount_priceKarpacz": 0,
                "priceExceptionsKarpacz": [],
                "isSelectedForPrint": false,
                "rowColor": "",
                "rowBackgroundColor": ""
            },
            {
                "Artykul": "Kamizelka damska z kożucha",
                "Kolor": "ZŁOTY",
                "fullName": "Kamizelka damska z kożucha ZŁOTY",
                "code": "6200600000010",
                "price": 420,
                "discount_price": 0,
                "category": "Kurtki kożuchy futra",
                "subcategory": "Kamizelka damska z kożcuha",
                "Plec": "D",
                "picture": "",
                "priceExceptions": [],
                "symbol": "",
                "sellingPoint": "",
                "barcode": "",
                "priceKarpacz": 0,
                "discount_priceKarpacz": 0,
                "priceExceptionsKarpacz": [],
                "isSelectedForPrint": false,
                "rowColor": "",
                "rowBackgroundColor": ""
            },
            {
                "Artykul": "Kamizelka damska z kożucha",
                "Kolor": "SREBRNY",
                "fullName": "Kamizelka damska z kożucha SREBRNY",
                "code": "6200600000011",
                "price": 420,
                "discount_price": 0,
                "category": "Kurtki kożuchy futra",
                "subcategory": "Kamizelka damska z kożcuha",
                "Plec": "D",
                "picture": "",
                "priceExceptions": [],
                "symbol": "",
                "sellingPoint": "",
                "barcode": "",
                "priceKarpacz": 0,
                "discount_priceKarpacz": 0,
                "priceExceptionsKarpacz": [],
                "isSelectedForPrint": false,
                "rowColor": "",
                "rowBackgroundColor": ""
            }
        ];
        
        console.log('Dodaję 9 pozostałych kamizelek damskich z kożucha...');
        
        for (const vest of womenVests) {
            const result = await collection.insertOne(vest);
            console.log(`Dodano kamizelkę damską: ${vest.fullName} (${vest.Kod}) - ID: ${result.insertedId}`);
        }
        
        console.log('\n✅ Wszystkie 9 pozostałych kamizelek damskich z kożucha zostało dodanych do bazy danych!');
        
        // Sprawdź ile mamy teraz kamizelek damskich
        const count = await collection.countDocuments({"subcategory": "Kamizelka damska z kożcuha"});
        console.log(`\nLiczba kamizelek damskich z kożucha w bazie: ${count}`);
        
    } catch (error) {
        console.error('Błąd podczas dodawania kamizelek damskich:', error);
    } finally {
        await client.close();
        console.log('Rozłączono z MongoDB');
    }
}

addWomenVests();