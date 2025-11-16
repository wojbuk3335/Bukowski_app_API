const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://wbukowski1985:3VX4byVnTO2CFRPc@bukowskiapp.emdzg.mongodb.net/BukowskiApp?retryWrites=true&w=majority&appName=BukowskiApp';

async function checkExistingWomenVests() {
    const client = new MongoClient(uri);
    
    try {
        await client.connect();
        const db = client.db('BukowskiApp');
        const collection = db.collection('goods');
        
        const existing = await collection.find({
            $or: [
                {Artykul: {$regex: 'Kamizelka damska'}},
                {fullName: {$regex: 'Kamizelka damska'}}
            ]
        }).toArray();
        
        console.log('Istniejące kamizelki damskie:');
        existing.forEach(item => console.log(`- ${item.fullName} (${item.Kod})`));
        
    } catch (error) {
        console.error('Błąd:', error);
    } finally {
        await client.close();
    }
}

checkExistingWomenVests();