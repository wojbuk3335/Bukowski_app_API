const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://wbukowski1985:3VX4byVnTO2CFRPc@bukowskiapp.emdzg.mongodb.net/BukowskiApp?retryWrites=true&w=majority&appName=BukowskiApp";

async function addMenVests() {
    const client = new MongoClient(uri);
    
    try {
        await client.connect();
        console.log("Połączono z MongoDB");
        
        const db = client.db("BukowskiApp");
        const goodsCollection = db.collection("goods");
        
        // Definiowanie 5 kamizelek męskich
        const menVests = [
            {
                name: "Kamizelka męska",
                color: "CZARNY", 
                description: "Kamizelka męska z kożucha CZARNY",
                code: "5530600000101",
                category: "Kurtki kożuchy futra",
                subcategory: "Kamizelka męska z kożucha",
                subcategory2: "",
                brand: "Bukowski",
                fullName: "Kamizelka męska z kożucha CZARNY",
                price: 420,
                material: "",
                composition: "",
                size: "M"
            },
            {
                name: "Kamizelka męska",
                color: "BRĄZOWY", 
                description: "Kamizelka męska z kożucha BRĄZOWY",
                code: "5530600000102",
                category: "Kurtki kożuchy futra",
                subcategory: "Kamizelka męska z kożucha",
                subcategory2: "",
                brand: "Bukowski",
                fullName: "Kamizelka męska z kożucha BRĄZOWY",
                price: 420,
                material: "",
                composition: "",
                size: "M"
            },
            {
                name: "Kamizelka męska",
                color: "RUDY", 
                description: "Kamizelka męska z kożucha RUDY",
                code: "5530600000103",
                category: "Kurtki kożuchy futra",
                subcategory: "Kamizelka męska z kożucha",
                subcategory2: "",
                brand: "Bukowski",
                fullName: "Kamizelka męska z kożucha RUDY",
                price: 420,
                material: "",
                composition: "",
                size: "M"
            },
            {
                name: "Kamizelka męska",
                color: "SZARY", 
                description: "Kamizelka męska z kożucha SZARY",
                code: "5530600000104",
                category: "Kurtki kożuchy futra",
                subcategory: "Kamizelka męska z kożucha",
                subcategory2: "",
                brand: "Bukowski",
                fullName: "Kamizelka męska z kożucha SZARY",
                price: 420,
                material: "",
                composition: "",
                size: "M"
            },
            {
                name: "Kamizelka męska",
                color: "NATURALNY", 
                description: "Kamizelka męska z kożucha NATURALNY",
                code: "5530600000105",
                category: "Kurtki kożuchy futra",
                subcategory: "Kamizelka męska z kożucha",
                subcategory2: "",
                brand: "Bukowski",
                fullName: "Kamizelka męska z kożucha NATURALNY",
                price: 420,
                material: "",
                composition: "",
                size: "M"
            }
        ];
        
        // Dodawanie produktów do bazy
        const result = await goodsCollection.insertMany(menVests);
        console.log(`Dodano ${result.insertedCount} kamizelek męskich:`);
        
        menVests.forEach((vest, index) => {
            console.log(`${index + 1}. ${vest.fullName} - ${vest.code}`);
        });
        
        console.log("\nProdukty zostały pomyślnie dodane do bazy danych!");
        
    } catch (error) {
        console.error("Błąd:", error);
    } finally {
        await client.close();
        console.log("Połączenie z bazą danych zostało zamknięte");
    }
}

addMenVests();