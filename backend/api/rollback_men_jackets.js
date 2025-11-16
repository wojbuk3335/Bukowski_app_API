const mongoose = require('mongoose');
const State = require('./app/db/models/state');
const Goods = require('./app/db/models/goods');

// Connection string
mongoose.connect('mongodb+srv://wbukowski1985:3VX4byVnTO2CFRPc@bukowskiapp.emdzg.mongodb.net/BukowskiApp?retryWrites=true&w=majority&appName=BukowskiApp').then(async () => {
    console.log('🔗 Połączono z bazą danych MongoDB Atlas');

    try {
        // 1. Znajdź kurtki męskie licówki które właśnie dodaliśmy
        const menJackets = await Goods.find({ 
            category: "Kurtki kożuchy futra",
            Rodzaj: "M"
        }).lean();
        
        console.log(`👔 Znaleziono ${menJackets.length} kurtek męskich w bazie danych`);
        
        const menJacketIds = menJackets.map(jacket => jacket._id);

        // 2. Sprawdź ile stanów będzie usuniętych
        const statesToDelete = await State.countDocuments({
            fullName: { $in: menJacketIds }
        });

        console.log(`📦 Znaleziono ${statesToDelete} stanów magazynowych kurtek męskich do usunięcia`);

        // 3. Usuń stany magazynowe kurtek męskich
        if (statesToDelete > 0) {
            const deleteResult = await State.deleteMany({
                fullName: { $in: menJacketIds }
            });

            console.log(`✅ Usunięto ${deleteResult.deletedCount} stanów magazynowych kurtek męskich`);
        } else {
            console.log(`⚠️  Nie znaleziono stanów do usunięcia`);
        }

        // 4. Sprawdź aktualny stan bazy
        const remainingStates = await State.countDocuments({});
        console.log(`📊 Pozostałych stanów w bazie: ${remainingStates}`);

        // 5. Usuń kurtki męskie z tabeli Goods
        const deleteGoodsResult = await Goods.deleteMany({
            category: "Kurtki kożuchy futra",
            Rodzaj: "M"
        });

        console.log(`✅ Usunięto ${deleteGoodsResult.deletedCount} kurtek męskich z tabeli Goods`);

        // 6. Sprawdź aktualny stan produktów
        const remainingGoods = await Goods.countDocuments({});
        console.log(`📦 Pozostałych produktów w bazie: ${remainingGoods}`);

        console.log(`\n🎉 UKOŃCZONO COFANIE ZMIAN!`);
        console.log(`✅ Usunięto stanów magazynowych: ${statesToDelete}`);
        console.log(`✅ Usunięto kurtek męskich: ${deleteGoodsResult.deletedCount}`);
        console.log(`📊 Stan bazy przywrócony do poprzedniego stanu`);

    } catch (error) {
        console.error('❌ Błąd:', error.message);
        console.error(error.stack);
    }

    mongoose.connection.close();
    console.log('\n🔌 Rozłączono z bazą danych');

}).catch(error => {
    console.error('❌ Błąd połączenia z bazą danych:', error.message);
    process.exit(1);
});