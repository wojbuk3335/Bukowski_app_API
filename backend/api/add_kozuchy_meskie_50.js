const mongoose = require('mongoose');
const Goods = require('./app/db/models/goods');
const Stock = require('./app/db/models/stock');
const config = require('./app/config');

// Lista 50 nazw kożuchów męskich
const kozuchyMeskieNames = [
    "Adam Premium", "Adrian", "Albert Premium", "Aleksander", "Andrzej Premium", "Antoni", "Arkadiusz Premium", "Artur Premium",
    "Bartosz", "Bartłomiej Premium", "Bogdan", "Bogusław", "Cezary", "Damian Premium", "Daniel", "Dariusz Premium",
    "Dawid Premium", "Denis", "Dominik Premium", "Edward", "Emil", "Ernest", "Filip Premium", "Franciszek",
    "Gabriel", "Grzegorz Premium", "Henryk", "Hubert", "Igor", "Ireneusz Premium", "Jacek", "Jakub Premium",
    "Jan", "Janusz", "Jarosław", "Jerzy", "Józef", "Julian", "Kamil Premium", "Karol", "Konrad", "Krzysztof Premium",
    "Leon Premium", "Leszek", "Łukasz", "Maciej Premium", "Marcin Premium", "Marek", "Marian Premium", "Mariusz Premium"
];

async function addKozuchyMeskie() {
    try {
        // Połącz z bazą danych
        await mongoose.connect(config.database, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Połączono z bazą danych MongoDB');

        // ID referencji (na podstawie wzoru)
        const subcategoryId = '68e74da9387e9de77060437b'; // Kożuch męski 
        const manufacturerId = '68eebe1df6e3fc5d0cee583e'; // Bukowski
        const colorId = '68eebaf28d1d7c9d4d6aea3c'; // CZARNY
        
        const products = [];
        let codeCounter = 4520700000001; // Kody dla męskich kożuchów (4xxx)

        for (let i = 0; i < kozuchyMeskieNames.length; i++) {
            const kozuchName = kozuchyMeskieNames[i];
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
                Tow_Kod: (2023 + i).toString(), // Kolejne kody towaru dla męskich
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
                Plec: "M", // Męski
                price: 1490, // Cena męskich kożuchów
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
            console.log(`✅ Pomyślnie dodano ${products.length} kożuchów męskich do bazy danych!`);
            
            // Wyświetl statystyki
            console.log('\n📊 Statystyki:');
            console.log(`- Kategoria: Kurtki kożuchy futra`);
            console.log(`- Podkategoria: Kożuch męski`);
            console.log(`- Producent: Bukowski`);
            console.log(`- Kolor: CZARNY`);
            console.log(`- Płeć: M (Męski)`);
            console.log(`- Cena: 1490 PLN`);
            console.log(`- Liczba dodanych produktów: ${products.length}`);
            console.log(`- Zakres kodów: ${products[0].code} - ${products[products.length-1].code}`);
        } else {
            console.log('⚠️ Wszystkie produkty już istnieją w bazie danych');
        }

    } catch (error) {
        console.error('❌ Błąd podczas dodawania kożuchów męskich:', error);
    } finally {
        mongoose.connection.close();
        console.log('Zamknięto połączenie z bazą danych');
    }
}

// Uruchom skrypt
if (require.main === module) {
    addKozuchyMeskie();
}

module.exports = addKozuchyMeskie;