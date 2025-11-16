const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://wbukowski1985:3VX4byVnTO2CFRPc@bukowskiapp.emdzg.mongodb.net/BukowskiApp?retryWrites=true&w=majority&appName=BukowskiApp";

async function addMenVestsSubcategory() {
    const client = new MongoClient(uri);
    
    try {
        await client.connect();
        console.log("Połączono z MongoDB");
        
        const db = client.db("BukowskiApp");
        const subcategoryCollection = db.collection("subcategorycoats");
        
        // Sprawdź czy podkategoria już istnieje
        const existingSubcategory = await subcategoryCollection.findOne({
            name: "Kamizelka męska z kożucha"
        });
        
        if (existingSubcategory) {
            console.log("Podkategoria 'Kamizelka męska z kożucha' już istnieje!");
            return;
        }
        
        // Dodaj podkategorię dla kamizelek męskich
        const menVestSubcategory = {
            name: "Kamizelka męska z kożucha",
            category: "Kurtki kożuchy futra",
            description: "Kamizelki męskie z naturalnego kożucha",
            created: new Date()
        };
        
        const result = await subcategoryCollection.insertOne(menVestSubcategory);
        console.log("Dodano podkategorię:", menVestSubcategory.name);
        console.log("ID podkategorii:", result.insertedId);
        
    } catch (error) {
        console.error("Błąd:", error);
    } finally {
        await client.close();
        console.log("Połączenie z bazą danych zostało zamknięte");
    }
}

addMenVestsSubcategory();