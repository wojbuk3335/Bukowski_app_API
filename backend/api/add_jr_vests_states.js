const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://wbukowski1985:3VX4byVnTO2CFRPc@bukowskiapp.emdzg.mongodb.net/BukowskiApp?retryWrites=true&w=majority&appName=BukowskiApp';

async function addJRVestsStates() {
    const client = new MongoClient(uri);
    
    try {
        await client.connect();
        console.log('Połączono z MongoDB');
        
        const db = client.db('BukowskiApp');
        const statesCollection = db.collection('states');
        const goodsCollection = db.collection('goods');
        
        // Pobierz wszystkie kamizelki JR z lisa
        const jrVests = await goodsCollection.find({
            "subcategory": "Kamizelka damska z lisa"
        }).toArray();
        
        console.log(`Znaleziono ${jrVests.length} kamizelek JR z lisa`);
        
        const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL', '6XL', '7XL', '8XL', '9XL'];
        const sellingPoints = ['Licówka', 'Galeria', 'Zakopane', 'Karpacz'];
        
        let addedCount = 0;
        
        for (const vest of jrVests) {
            for (const size of sizes) {
                for (const sellingPoint of sellingPoints) {
                    const state = {
                        "name": vest.fullName,
                        "code": vest.code,
                        "size": size,
                        "sellingPoint": sellingPoint,
                        "quantity": Math.floor(Math.random() * 5) + 1, // 1-5 sztuk (mniej niż standardowe bo droższe)
                        "reservedQuantity": 0,
                        "price": vest.price,
                        "discount_price": vest.discount_price,
                        "priceKarpacz": vest.priceKarpacz,
                        "discount_priceKarpacz": vest.discount_priceKarpacz
                    };
                    
                    await statesCollection.insertOne(state);
                    addedCount++;
                }
            }
        }
        
        console.log(`✅ Dodano ${addedCount} stanów magazynowych dla kamizelek JR z lisa`);
        console.log(`(${jrVests.length} produktów × ${sizes.length} rozmiarów × ${sellingPoints.length} punktów sprzedaży)`);
        
        // Sprawdź całkowitą liczbę stanów dla kamizelek JR
        const totalStates = await statesCollection.countDocuments({
            "name": {$regex: "JR 53"}
        });
        console.log(`\nCałkowita liczba stanów dla kamizelek JR: ${totalStates}`);
        
    } catch (error) {
        console.error('Błąd podczas dodawania stanów JR:', error);
    } finally {
        await client.close();
        console.log('Rozłączono z MongoDB');
    }
}

addJRVestsStates();