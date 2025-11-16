const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://wbukowski1985:3VX4byVnTO2CFRPc@bukowskiapp.emdzg.mongodb.net/BukowskiApp?retryWrites=true&w=majority&appName=BukowskiApp';

async function checkProductStructure() {
    const client = new MongoClient(uri);
    
    try {
        await client.connect();
        const db = client.db('BukowskiApp');
        const collection = db.collection('goods');
        
        // Sprawdź jeden przykładowy produkt
        const example = await collection.findOne({});
        console.log('Struktura przykładowego produktu:');
        console.log(JSON.stringify(example, null, 2));
        
    } catch (error) {
        console.error('Błąd:', error);
    } finally {
        await client.close();
    }
}

checkProductStructure();