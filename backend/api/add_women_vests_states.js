const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://wbukowski1985:3VX4byVnTO2CFRPc@bukowskiapp.emdzg.mongodb.net/BukowskiApp?retryWrites=true&w=majority&appName=BukowskiApp';

async function addWomenVestsStates() {
    const client = new MongoClient(uri);
    
    try {
        await client.connect();
        console.log('Połączono z MongoDB');
        
        const db = client.db('BukowskiApp');
        const statesCollection = db.collection('states');
        const goodsCollection = db.collection('goods');
        
        // Pobierz wszystkie kamizelki damskie z kożucha
        const womenVests = await goodsCollection.find({
            "subcategory": "Kamizelka damska z kożcuha"
        }).toArray();
        
        console.log(`Znaleziono ${womenVests.length} kamizelek damskich z kożucha`);
        
        const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL', '6XL', '7XL', '8XL', '9XL'];
        const sellingPoints = ['Licówka', 'Galeria', 'Zakopane', 'Karpacz'];
        
        let addedCount = 0;
        
        for (const vest of womenVests) {
            for (const size of sizes) {
                for (const sellingPoint of sellingPoints) {
                    const state = {
                        "name": vest.fullName,
                        "code": vest.code,
                        "size": size,
                        "sellingPoint": sellingPoint,
                        "quantity": Math.floor(Math.random() * 8) + 2, // 2-9 sztuk
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
        
        console.log(`✅ Dodano ${addedCount} stanów magazynowych dla kamizelek damskich z kożucha`);
        console.log(`(${womenVests.length} produktów × ${sizes.length} rozmiarów × ${sellingPoints.length} punktów sprzedaży)`);
        
        // Sprawdź całkowitą liczbę stanów dla kamizelek damskich
        const totalStates = await statesCollection.countDocuments({
            "name": {$regex: "Kamizelka damska z kożucha"}
        });
        console.log(`\nCałkowita liczba stanów dla kamizelek damskich z kożucha: ${totalStates}`);
        
    } catch (error) {
        console.error('Błąd podczas dodawania stanów:', error);
    } finally {
        await client.close();
        console.log('Rozłączono z MongoDB');
    }
}

addWomenVestsStates();