const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://wbukowski1985:3VX4byVnTO2CFRPc@bukowskiapp.emdzg.mongodb.net/BukowskiApp?retryWrites=true&w=majority&appName=BukowskiApp';

async function checkExistingCodes() {
    const client = new MongoClient(uri);
    
    try {
        await client.connect();
        const db = client.db('BukowskiApp');
        const collection = db.collection('goods');
        
        const existing = await collection.find({
            code: {$regex: '^6200600000'}
        }).toArray();
        
        console.log('Istniejące kody z przedziału 6200600000xxx:');
        existing.forEach(item => console.log(`- ${item.code} (${item.fullName})`));
        
        // Znajdź najwyższy kod
        const codes = existing.map(item => parseInt(item.code)).filter(code => !isNaN(code));
        const maxCode = Math.max(...codes, 6200600000000);
        console.log(`\nNajwyższy kod: ${maxCode}`);
        console.log(`Następny dostępny kod: ${maxCode + 1}`);
        
    } catch (error) {
        console.error('Błąd:', error);
    } finally {
        await client.close();
    }
}

checkExistingCodes();