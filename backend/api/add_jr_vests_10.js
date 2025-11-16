const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://wbukowski1985:3VX4byVnTO2CFRPc@bukowskiapp.emdzg.mongodb.net/BukowskiApp?retryWrites=true&w=majority&appName=BukowskiApp';

async function addJRVests() {
    const client = new MongoClient(uri);
    
    try {
        await client.connect();
        console.log('Połączono z MongoDB');
        
        const db = client.db('BukowskiApp');
        const collection = db.collection('goods');
        
        // 10 kamizelek JR z lisa z różnymi wariantami
        const jrVests = [
            {
                "Artykul": "JR 53.1-KP",
                "Kolor": "CZARNY",
                "fullName": "JR 53.1-KP CZARNY",
                "code": "8130000000007",
                "price": 2190,
                "discount_price": 0,
                "category": "Kurtki kożuchy futra",
                "subcategory": "Kamizelka damska z lisa",
                "Plec": "D",
                "Marka": "JR",
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
                "Artykul": "JR 53.2-KP",
                "Kolor": "BRĄZOWY",
                "fullName": "JR 53.2-KP BRĄZOWY",
                "code": "8130000000008",
                "price": 2190,
                "discount_price": 0,
                "category": "Kurtki kożuchy futra",
                "subcategory": "Kamizelka damska z lisa",
                "Plec": "D",
                "Marka": "JR",
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
                "Artykul": "JR 53.3-KP",
                "Kolor": "RUDY",
                "fullName": "JR 53.3-KP RUDY",
                "code": "8130000000009",
                "price": 2190,
                "discount_price": 0,
                "category": "Kurtki kożuchy futra",
                "subcategory": "Kamizelka damska z lisa",
                "Plec": "D",
                "Marka": "JR",
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
                "Artykul": "JR 53.4-KP",
                "Kolor": "SZARY",
                "fullName": "JR 53.4-KP SZARY",
                "code": "8130000000010",
                "price": 2190,
                "discount_price": 0,
                "category": "Kurtki kożuchy futra",
                "subcategory": "Kamizelka damska z lisa",
                "Plec": "D",
                "Marka": "JR",
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
                "Artykul": "JR 53.5-KP",
                "Kolor": "NATURALNY",
                "fullName": "JR 53.5-KP NATURALNY",
                "code": "8130000000011",
                "price": 2190,
                "discount_price": 0,
                "category": "Kurtki kożuchy futra",
                "subcategory": "Kamizelka damska z lisa",
                "Plec": "D",
                "Marka": "JR",
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
                "Artykul": "JR 53.6-KP",
                "Kolor": "BEŻOWY",
                "fullName": "JR 53.6-KP BEŻOWY",
                "code": "8130000000012",
                "price": 2190,
                "discount_price": 0,
                "category": "Kurtki kożuchy futra",
                "subcategory": "Kamizelka damska z lisa",
                "Plec": "D",
                "Marka": "JR",
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
                "Artykul": "JR 53.7-KP",
                "Kolor": "BIAŁY",
                "fullName": "JR 53.7-KP BIAŁY",
                "code": "8130000000013",
                "price": 2190,
                "discount_price": 0,
                "category": "Kurtki kożuchy futra",
                "subcategory": "Kamizelka damska z lisa",
                "Plec": "D",
                "Marka": "JR",
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
                "Artykul": "JR 53.8-KP",
                "Kolor": "KREMOWY",
                "fullName": "JR 53.8-KP KREMOWY",
                "code": "8130000000014",
                "price": 2190,
                "discount_price": 0,
                "category": "Kurtki kożuchy futra",
                "subcategory": "Kamizelka damska z lisa",
                "Plec": "D",
                "Marka": "JR",
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
                "Artykul": "JR 53.9-KP",
                "Kolor": "ZŁOTY",
                "fullName": "JR 53.9-KP ZŁOTY",
                "code": "8130000000015",
                "price": 2190,
                "discount_price": 0,
                "category": "Kurtki kożuchy futra",
                "subcategory": "Kamizelka damska z lisa",
                "Plec": "D",
                "Marka": "JR",
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
                "Artykul": "JR 53.10-KP",
                "Kolor": "SREBRNY",
                "fullName": "JR 53.10-KP SREBRNY",
                "code": "8130000000016",
                "price": 2190,
                "discount_price": 0,
                "category": "Kurtki kożuchy futra",
                "subcategory": "Kamizelka damska z lisa",
                "Plec": "D",
                "Marka": "JR",
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
        
        console.log('Dodaję 10 kamizelek JR z lisa...');
        
        for (const vest of jrVests) {
            const result = await collection.insertOne(vest);
            console.log(`Dodano kamizelkę JR: ${vest.fullName} (${vest.code}) - ID: ${result.insertedId}`);
        }
        
        console.log('\n✅ Wszystkie 10 kamizelek JR z lisa zostało dodanych do bazy danych!');
        
        // Sprawdź ile mamy teraz kamizelek JR z lisa
        const count = await collection.countDocuments({"subcategory": "Kamizelka damska z lisa"});
        console.log(`\nLiczba kamizelek JR z lisa w bazie: ${count}`);
        
    } catch (error) {
        console.error('Błąd podczas dodawania kamizelek JR:', error);
    } finally {
        await client.close();
        console.log('Rozłączono z MongoDB');
    }
}

addJRVests();