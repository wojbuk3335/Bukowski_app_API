const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://wbukowski1985:3VX4byVnTO2CFRPc@bukowskiapp.emdzg.mongodb.net/BukowskiApp?retryWrites=true&w=majority&appName=BukowskiApp';

async function addWomenVestsSubcategory() {
    const client = new MongoClient(uri);
    
    try {
        await client.connect();
        console.log('Połączono z MongoDB');
        
        const db = client.db('BukowskiApp');
        const collection = db.collection('subcategorycoats');
        
        const subcategory = {
            "Kat_1_Opis_1": "Kamizelka damska z kożcuha",
            "Aktywna": "TAK"
        };
        
        const result = await collection.insertOne(subcategory);
        console.log(`✅ Dodano podkategorię "Kamizelka damska z kożcuha" - ID: ${result.insertedId}`);
        
        // Sprawdź wszystkie podkategorie z kamizelkami
        const allVestSubcategories = await collection.find({
            "Kat_1_Opis_1": {$regex: "Kamizelka"}
        }).toArray();
        
        console.log('\nWszystkie podkategorie z kamizelkami:');
        allVestSubcategories.forEach(sub => console.log(`- ${sub.Kat_1_Opis_1}`));
        
    } catch (error) {
        console.error('Błąd podczas dodawania podkategorii:', error);
    } finally {
        await client.close();
        console.log('Rozłączono z MongoDB');
    }
}

addWomenVestsSubcategory();