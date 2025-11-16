const mongoose = require('mongoose');
const Goods = require('./app/db/models/goods');
const Stock = require('./app/db/models/stock');
const config = require('./app/config');

// Lista 140 nazw kożuchów damskich
const kozuchyNames = [
    "Adriana", "Agata", "Agnieszka", "Agnieszka II", "Aleksandra Premium", "Alicja Premium", "Alina Premium", 
    "Amanda Premium", "Anastazja", "Angelika", "Aniela", "Anita", "Antonina", "Arleta", "Aurelia",
    "Barbara Premium", "Beata Premium", "Bernadeta", "Blanka", "Bogna", "Bożena", "Brygida",
    "Cecylia Premium", "Celina Premium", "Czesława", "Daria", "Debora", "Dominika Premium", "Dorota", "Dżesika",
    "Edyta Premium", "Eleonora", "Eliza Premium", "Elżbieta", "Emilia Premium", "Estera", "Eugenia", "Ewa", "Ewelina",
    "Felicja Premium", "Filomena", "Franciszka", "Gabriela Premium", "Grażyna Premium", "Halina", "Hanna", "Helena Premium",
    "Henryka", "Honorata Premium", "Ilona Premium", "Inga Premium", "Irena", "Irma", "Iwona Premium", "Izabela Premium",
    "Jadwiga Premium", "Jagoda", "Janina", "Jolanta", "Józefa", "Judyta Premium", "Julia", "Julita", "Justyna Premium",
    "Kamila", "Karolina Premium", "Katarzyna Premium", "Klara Premium", "Klaudia", "Kornelia", "Krystyna Premium",
    "Larisa", "Laura Premium", "Lidia", "Liliana", "Lucyna Premium", "Łucja", "Magdalena Premium", "Maja Premium",
    "Malwina Premium", "Marcelina Premium", "Margarita Premium", "Maria", "Marianna", "Mariola Premium", "Marlena",
    "Marta", "Martyna", "Matylda", "Michalina", "Milena", "Monika Premium", "Nadia", "Natalia Premium", "Natasza",
    "Nikola", "Nina Premium", "Oktawia Premium", "Olimpia Premium", "Olivia Premium", "Otylia Premium", "Patrycja Premium",
    "Paula Premium", "Paulina", "Pola Premium", "Priscilla", "Renata Premium", "Rita", "Róża Premium", "Rozalia",
    "Sabina", "Sandra", "Sara", "Stella", "Sylwia Premium", "Tamara", "Teresa Premium", "Tina Premium", "Urszula Premium",
    "Valeria", "Vanessa", "Wanda", "Weronika Premium", "Wiktoria Premium", "Wioletta", "Zofia Premium", "Zuzanna Premium",
    "Żaneta Premium", "Agata Lux", "Alicja Lux", "Anna Lux", "Barbara Lux", "Beata Lux", "Cecylia Lux", "Diana Lux",
    "Eliza Lux", "Gabriela Lux", "Helena Lux", "Iwona Lux", "Julia Lux", "Katarzyna Lux", "Laura Lux", "Magdalena Lux",
    "Natalia Lux", "Olivia Lux", "Patrycja Lux", "Renata Lux", "Sylwia Lux", "Teresa Lux", "Weronika Lux", "Zofia Lux"
];

async function addKozuchyDamskie() {
    try {
        // Połącz z bazą danych
        await mongoose.connect(config.database, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Połączono z bazą danych MongoDB');

        // ID referencji (na podstawie wzoru)
        const subcategoryId = '68e74db3387e9de770604382'; // Kożuch damski
        const manufacturerId = '68eebe1df6e3fc5d0cee583e'; // Bukowski
        const colorId = '68eebaf28d1d7c9d4d6aea3c'; // CZARNY
        
        const products = [];
        let codeCounter = 6520700000001; // Zaczynamy od następnego kodu po Wiktoria długa

        for (let i = 0; i < kozuchyNames.length; i++) {
            const kozuchName = kozuchyNames[i];
            const fullName = `${kozuchName} CZARNY`;
            const code = codeCounter.toString();

            // Sprawdź czy produkt już istnieje
            const existingProduct = await Goods.findOne({
                $or: [
                    { fullName: fullName },
                    { code: code }
                ]
            });

            if (existingProduct) {
                console.log(`Produkt ${fullName} już istnieje, pomijam...`);
                codeCounter++;
                continue;
            }

            // Utwórz wpis w tabeli Stock
            const stock = new Stock({
                _id: new mongoose.Types.ObjectId(),
                Tow_Kod: (1023 + i).toString(), // Kolejne kody towaru
                Tow_Opis: kozuchName
            });

            try {
                await stock.save();
                console.log(`Utworzono stock dla: ${kozuchName}`);
            } catch (stockError) {
                if (stockError.code === 11000) {
                    console.log(`Stock dla ${kozuchName} już istnieje, używam istniejącego...`);
                    const existingStock = await Stock.findOne({ Tow_Opis: kozuchName });
                    stock._id = existingStock._id;
                } else {
                    throw stockError;
                }
            }

            // Utwórz produkt
            const product = {
                _id: new mongoose.Types.ObjectId(),
                stock: stock._id,
                color: colorId,
                fullName: fullName,
                code: code,
                category: "Kurtki kożuchy futra",
                subcategory: subcategoryId,
                manufacturer: manufacturerId,
                Plec: "D",
                price: 1390, // Cena jak w wzorze
                discount_price: 0,
                priceKarpacz: 0,
                discount_priceKarpacz: 0,
                priceExceptionsKarpacz: [],
                picture: "",
                priceExceptions: [],
                sellingPoint: "",
                barcode: "",
                isSelectedForPrint: false,
                rowBackgroundColor: '#ffffff'
            };

            products.push(product);
            codeCounter++;
        }

        if (products.length > 0) {
            // Dodaj wszystkie produkty na raz
            await Goods.insertMany(products);
            console.log(`✅ Pomyślnie dodano ${products.length} kożuchów damskich do bazy danych!`);
            
            // Wyświetl statystyki
            console.log('\n📊 Statystyki:');
            console.log(`- Kategoria: Kurtki kożuchy futra`);
            console.log(`- Podkategoria: Kożuch damski`);
            console.log(`- Producent: Bukowski`);
            console.log(`- Kolor: CZARNY`);
            console.log(`- Płeć: D (Damski)`);
            console.log(`- Cena: 1390 PLN`);
            console.log(`- Liczba dodanych produktów: ${products.length}`);
            console.log(`- Zakres kodów: ${products[0].code} - ${products[products.length-1].code}`);
        } else {
            console.log('⚠️ Wszystkie produkty już istnieją w bazie danych');
        }

    } catch (error) {
        console.error('❌ Błąd podczas dodawania kożuchów:', error);
    } finally {
        mongoose.connection.close();
        console.log('Zamknięto połączenie z bazą danych');
    }
}

// Uruchom skrypt
if (require.main === module) {
    addKozuchyDamskie();
}

module.exports = addKozuchyDamskie;