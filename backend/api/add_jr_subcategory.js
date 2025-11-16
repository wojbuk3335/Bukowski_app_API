const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://wbukowski1985:3VX4byVnTO2CFRPc@bukowskiapp.emdzg.mongodb.net/BukowskiApp?retryWrites=true&w=majority&appName=BukowskiApp';

async function addJRSubcategory() {
    const client = new MongoClient(uri);
    
    try {
        await client.connect();
        console.log('Połączono z MongoDB');
        
        const db = client.db('BukowskiApp');
        const collection = db.collection('subcategorycoats');
        
        // Sprawdź czy już istnieje
        const existing = await collection.findOne({'Kat_1_Opis_1': 'Kamizelka damska z lisa'});
        
        if (existing) {
            console.log('Podkategoria już istnieje:', existing);
        } else {
            // Dodaj do starego modelu
            const oldSubcategory = {
                "Kat_1_Opis_1": "Kamizelka damska z lisa",
                "Aktywna": "TAK"
            };
            
            const result1 = await collection.insertOne(oldSubcategory);
            console.log(`✅ Dodano podkategorię "Kamizelka damska z lisa" do starego modelu - ID: ${result1.insertedId}`);
        }
        
        // Sprawdź nowy model
        const existingNew = await collection.findOne({ name: 'Kamizelka damska z lisa' });
        
        if (existingNew) {
            console.log('Podkategoria już istnieje w nowym modelu:', existingNew);
        } else {
            // Dodaj do nowego modelu
            const newSubcategory = {
                name: 'Kamizelka damska z lisa',
                category: 'Kurtki kożuchy futra',
                description: 'Kamizelki damskie z lisa marki JR',
                created: new Date()
            };
            
            const result2 = await collection.insertOne(newSubcategory);
            console.log(`✅ Dodano podkategorię "Kamizelka damska z lisa" do nowego modelu - ID: ${result2.insertedId}`);
        }
        
        // Sprawdź wszystkie podkategorie z kamizelkami
        const allVestSubcategories = await collection.find({
            $or: [
                {"Kat_1_Opis_1": {$regex: "Kamizelka"}},
                {"name": {$regex: "Kamizelka"}}
            ]
        }).toArray();
        
        console.log('\nWszystkie podkategorie z kamizelkami:');
        allVestSubcategories.forEach(sub => {
            if (sub.Kat_1_Opis_1) {
                console.log(`- ${sub.Kat_1_Opis_1} (stary model)`);
            }
            if (sub.name) {
                console.log(`- ${sub.name} (nowy model)`);
            }
        });
        
    } catch (error) {
        console.error('Błąd podczas dodawania podkategorii JR:', error);
    } finally {
        await client.close();
        console.log('Rozłączono z MongoDB');
    }
}

addJRSubcategory();