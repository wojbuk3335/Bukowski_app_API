const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://wbukowski1985:3VX4byVnTO2CFRPc@bukowskiapp.emdzg.mongodb.net/BukowskiApp?retryWrites=true&w=majority&appName=BukowskiApp";

async function addMenVestsStates() {
    const client = new MongoClient(uri);
    
    try {
        await client.connect();
        console.log("Połączono z MongoDB");
        
        const db = client.db("BukowskiApp");
        const statesCollection = db.collection("states");
        
        // Lista kodów kamizelek męskich
        const menVestsCodes = [
            "5530600000101", // CZARNY
            "5530600000102", // BRĄZOWY  
            "5530600000103", // RUDY
            "5530600000104", // SZARY
            "5530600000105"  // NATURALNY
        ];
        
        // Rozmiary męskie
        const menSizes = [44, 46, 48, 50, 52, 54, 56, 58, 60, 62, 64, 66, 68];
        
        // Punkty sprzedaży
        const sellingPoints = [
            "Zakopane", "Licówka", "Krupówki", "Warszawa"
        ];
        
        let totalStates = 0;
        const statesToAdd = [];
        
        // Tworzenie stanów dla każdej kombinacji kod + rozmiar + punkt sprzedaży
        for (const code of menVestsCodes) {
            for (const size of menSizes) {
                for (const sellingPoint of sellingPoints) {
                    const state = {
                        Kod_towaru: code,
                        Rozmiar: size.toString(),
                        Punkt_sprzedazy: sellingPoint,
                        Stan: 0, // Początkowy stan = 0
                        Stan_min: 0,
                        Stan_max: 50,
                        created: new Date(),
                        updated: new Date()
                    };
                    
                    statesToAdd.push(state);
                    totalStates++;
                }
            }
        }
        
        console.log(`Przygotowano ${totalStates} stanów magazynowych do dodania...`);
        
        // Dodawanie stanów (w pakietach po 100)
        const batchSize = 100;
        let addedCount = 0;
        
        for (let i = 0; i < statesToAdd.length; i += batchSize) {
            const batch = statesToAdd.slice(i, i + batchSize);
            const result = await statesCollection.insertMany(batch);
            addedCount += result.insertedCount;
            console.log(`Dodano ${result.insertedCount} stanów (łącznie: ${addedCount}/${totalStates})`);
        }
        
        console.log(`\n✅ Pomyślnie dodano ${addedCount} stanów magazynowych dla kamizelek męskich!`);
        console.log(`📦 Kody produktów: ${menVestsCodes.join(", ")}`);
        console.log(`📏 Rozmiary: ${menSizes.join(", ")}`);
        console.log(`🏪 Punkty sprzedaży: ${sellingPoints.join(", ")}`);
        
    } catch (error) {
        console.error("Błąd:", error);
    } finally {
        await client.close();
        console.log("Połączenie z bazą danych zostało zamknięte");
    }
}

addMenVestsStates();