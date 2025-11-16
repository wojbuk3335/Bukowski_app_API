const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://wbukowski1985:3VX4byVnTO2CFRPc@bukowskiapp.emdzg.mongodb.net/BukowskiApp?retryWrites=true&w=majority&appName=BukowskiApp';

async function checkJRCodes() {
    const client = new MongoClient(uri);
    
    try {
        await client.connect();
        const db = client.db('BukowskiApp');
        const collection = db.collection('goods');
        
        const existing = await collection.find({
            code: {$regex: '^813000000'}
        }).toArray();
        
        console.log('Istniejące kody z przedziału 813000000xxxx:');
        existing.forEach(item => console.log(`- ${item.code} (${item.fullName})`));
        
        // Znajdź najwyższy kod
        const codes = existing.map(item => parseInt(item.code)).filter(code => !isNaN(code));
        const maxCode = Math.max(...codes, 8130000000000);
        console.log(`\nNajwyższy kod: ${maxCode}`);
        console.log(`Następne dostępne kody: ${maxCode + 1} - ${maxCode + 10}`);
        
    } catch (error) {
        console.error('Błąd:', error);
    } finally {
        await client.close();
    }
}

checkJRCodes();