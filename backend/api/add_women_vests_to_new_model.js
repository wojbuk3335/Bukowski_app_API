const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://wbukowski1985:3VX4byVnTO2CFRPc@bukowskiapp.emdzg.mongodb.net/BukowskiApp?retryWrites=true&w=majority&appName=BukowskiApp';

async function addWomenVestsToNewModel() {
    const client = new MongoClient(uri);
    
    try {
        await client.connect();
        console.log('Połączono z MongoDB');
        
        const db = client.db('BukowskiApp');
        const collection = db.collection('subcategorycoats');
        
        // Sprawdź czy już istnieje w nowym modelu
        const existing = await collection.findOne({ name: 'Kamizelka damska z kożcuha' });
        
        if (existing) {
            console.log('Podkategoria już istnieje w nowym modelu:', existing);
        } else {
            // Dodaj do nowego modelu
            const newSubcategory = {
                name: 'Kamizelka damska z kożcuha',
                category: 'Kurtki kożuchy futra',
                description: 'Kamizelki damskie z kożucha',
                created: new Date()
            };
            
            const result = await collection.insertOne(newSubcategory);
            console.log(`✅ Dodano kamizelek damskich do nowego modelu - ID: ${result.insertedId}`);
        }
        
        // Sprawdź ile mamy kamizelek w bazie
        const womenVests = await db.collection('goods').find({
            subcategory: 'Kamizelka damska z kożcuha'
        }).toArray();
        
        console.log(`\nLiczba kamizelek damskich z kożucha w goods: ${womenVests.length}`);
        womenVests.forEach(vest => console.log(`- ${vest.fullName} (${vest.code})`));
        
    } catch (error) {
        console.error('Błąd:', error);
    } finally {
        await client.close();
        console.log('Rozłączono z MongoDB');
    }
}

addWomenVestsToNewModel();