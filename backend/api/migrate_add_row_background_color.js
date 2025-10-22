const { MongoClient } = require('mongodb');

// Konfiguracja bazy danych
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'bukowski_inventory';

async function migrateAddRowBackgroundColor() {
    const client = new MongoClient(uri);
    
    try {
        console.log('🔄 Łączenie z bazą danych...');
        await client.connect();
        
        const db = client.db(dbName);
        const collection = db.collection('goods');
        
        console.log('📊 Sprawdzanie produktów bez pola rowBackgroundColor...');
        
        // Sprawdź ile produktów nie ma pola rowBackgroundColor
        const countWithoutField = await collection.countDocuments({
            rowBackgroundColor: { $exists: false }
        });
        
        console.log(`📈 Znaleziono ${countWithoutField} produktów bez pola rowBackgroundColor`);
        
        if (countWithoutField === 0) {
            console.log('✅ Wszystkie produkty już mają pole rowBackgroundColor. Migracja nie jest potrzebna.');
            return;
        }
        
        console.log('🔄 Dodawanie pola rowBackgroundColor do wszystkich produktów...');
        
        // Dodaj pole rowBackgroundColor z domyślną wartością #ffffff (biały) do wszystkich produktów
        const result = await collection.updateMany(
            { rowBackgroundColor: { $exists: false } },
            { 
                $set: { 
                    rowBackgroundColor: '#ffffff' 
                } 
            }
        );
        
        console.log(`✅ Pomyślnie zaktualizowano ${result.modifiedCount} produktów`);
        console.log(`📝 Wszystkie produkty mają teraz pole rowBackgroundColor z domyślną wartością '#ffffff'`);
        
        // Sprawdź wynik
        const totalCount = await collection.countDocuments({});
        const countWithField = await collection.countDocuments({
            rowBackgroundColor: { $exists: true }
        });
        
        console.log(`📊 Podsumowanie:`);
        console.log(`   - Łączna liczba produktów: ${totalCount}`);
        console.log(`   - Produkty z polem rowBackgroundColor: ${countWithField}`);
        console.log(`   - Procent zaktualizowanych: ${((countWithField / totalCount) * 100).toFixed(1)}%`);
        
        if (countWithField === totalCount) {
            console.log('🎉 Migracja zakończona pomyślnie! Wszystkie produkty mają pole rowBackgroundColor.');
        } else {
            console.log('⚠️  Uwaga: Nie wszystkie produkty zostały zaktualizowane.');
        }
        
    } catch (error) {
        console.error('❌ Błąd podczas migracji:', error);
        throw error;
    } finally {
        await client.close();
        console.log('🔌 Połączenie z bazą danych zamknięte');
    }
}

// Uruchom migrację jeśli skrypt jest wywoływany bezpośrednio
if (require.main === module) {
    console.log('🚀 Rozpoczynanie migracji: Dodawanie pola rowBackgroundColor');
    console.log('📅 Data:', new Date().toLocaleString('pl-PL'));
    console.log('🗃️  Baza danych:', dbName);
    console.log('🔗 URI:', uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Ukryj hasło w logach
    console.log('');
    
    migrateAddRowBackgroundColor()
        .then(() => {
            console.log('');
            console.log('✅ Migracja zakończona pomyślnie!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('');
            console.error('❌ Migracja zakończona błędem:', error);
            process.exit(1);
        });
}

module.exports = migrateAddRowBackgroundColor;