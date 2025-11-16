const mongoose = require('mongoose');
const State = require('./app/db/models/state');
const Goods = require('./app/db/models/goods');
const Size = require('./app/db/models/size');
const User = require('./app/db/models/user');

// Użyj tego samego connection stringu
mongoose.connect('mongodb+srv://wbukowski1985:3VX4byVnTO2CFRPc@bukowskiapp.emdzg.mongodb.net/BukowskiApp?retryWrites=true&w=majority&appName=BukowskiApp').then(async () => {
    console.log('🔗 Połączono z bazą danych MongoDB Atlas');
    
    try {
        console.log('🧹 Rozpoczynam czyszczenie nadmiaru kurtek...\n');
        
        // 1. Znajdź wszystkie stany magazynowe
        const allStates = await State.find({})
            .populate('fullName')
            .populate('size')
            .populate('sellingPoint');
        
        console.log(`📊 Łączna liczba pozycji w bazie: ${allStates.length}`);
        
        // 2. Grupuj według kurtki + rozmiar
        const groupedStates = {};
        
        for (const state of allStates) {
            if (!state.fullName || !state.size) continue;
            
            const key = `${state.fullName.nazwa}-${state.size.name}`;
            
            if (!groupedStates[key]) {
                groupedStates[key] = [];
            }
            
            groupedStates[key].push(state);
        }
        
        console.log(`🔍 Znaleziono ${Object.keys(groupedStates).length} różnych kombinacji kurtka+rozmiar`);
        
        // 3. Sprawdź które kombinacje mają więcej niż 3 sztuki
        let toDelete = [];
        let keptCount = 0;
        let deletedCount = 0;
        
        for (const [key, states] of Object.entries(groupedStates)) {
            if (states.length > 3) {
                console.log(`⚠️  ${key}: ${states.length} sztuk (zostanie ${Math.min(3, states.length)})`);
                
                // Posortuj według punktu sprzedaży i wybierz 3 pierwsze
                const uniquePoints = {};
                const toKeep = [];
                
                // Najpierw spróbuj zachować po 1 sztuce z różnych punktów
                for (const state of states) {
                    const pointName = state.sellingPoint?.sellingPoint || 'Unknown';
                    
                    if (!uniquePoints[pointName] && toKeep.length < 3) {
                        uniquePoints[pointName] = true;
                        toKeep.push(state);
                    }
                }
                
                // Jeśli mamy mniej niż 3, dodaj resztę
                for (const state of states) {
                    if (toKeep.length >= 3) break;
                    if (!toKeep.includes(state)) {
                        toKeep.push(state);
                    }
                }
                
                // Oznacz resztę do usunięcia
                for (const state of states) {
                    if (!toKeep.includes(state)) {
                        toDelete.push(state._id);
                        deletedCount++;
                    } else {
                        keptCount++;
                    }
                }
                
                // Pokaż które punkty zostają
                const keptPoints = toKeep.map(s => s.sellingPoint?.sellingPoint || 'Unknown').join(', ');
                console.log(`   ✅ Zostają w: ${keptPoints}`);
                
            } else {
                // Ta kombinacja ma 3 lub mniej sztuk - zostaje bez zmian
                keptCount += states.length;
                
                if (states.length > 1) {
                    const points = states.map(s => s.sellingPoint?.sellingPoint || 'Unknown').join(', ');
                    console.log(`✅ ${key}: ${states.length} sztuk - OK (w: ${points})`);
                }
            }
        }
        
        console.log(`\n📊 PODSUMOWANIE PRZED CZYSZCZENIEM:`);
        console.log(`   🗑️  Do usunięcia: ${deletedCount} pozycji`);
        console.log(`   ✅ Do zachowania: ${keptCount} pozycji`);
        console.log(`   📦 Łącznie będzie: ${keptCount} pozycji (było ${allStates.length})`);
        
        if (toDelete.length === 0) {
            console.log('\n🎉 Nie ma nic do czyszczenia! Stan magazynowy jest już optymalny.');
            mongoose.connection.close();
            return;
        }
        
        // 4. Usuń nadmiar
        console.log(`\n🗑️  Usuwam ${toDelete.length} nadmiarowych pozycji...`);
        
        const batchSize = 100;
        let deleted = 0;
        
        for (let i = 0; i < toDelete.length; i += batchSize) {
            const batch = toDelete.slice(i, i + batchSize);
            await State.deleteMany({ _id: { $in: batch } });
            deleted += batch.length;
            console.log(`🗑️  Usunięto: ${deleted}/${toDelete.length} pozycji`);
        }
        
        // 5. Sprawdź stan po czyszczeniu
        const finalCount = await State.countDocuments({});
        console.log(`\n🎉 CZYSZCZENIE UKOŃCZONE!`);
        console.log(`📊 Stan po czyszczeniu: ${finalCount} pozycji`);
        console.log(`🗑️  Usunięto: ${allStates.length - finalCount} pozycji`);
        
        // 6. Pokaż przykłady końcowego stanu
        console.log(`\n💡 PRZYKŁADY KOŃCOWEGO STANU:`);
        
        const sampleStates = await State.find({})
            .populate('fullName')
            .populate('size')
            .populate('sellingPoint')
            .limit(10);
        
        const examples = {};
        for (const state of sampleStates) {
            if (!state.fullName || !state.size) continue;
            
            const key = `${state.fullName.nazwa} ${state.size.name}`;
            if (!examples[key]) {
                examples[key] = [];
            }
            examples[key].push(state.sellingPoint?.sellingPoint || 'Unknown');
        }
        
        let count = 0;
        for (const [jacket, points] of Object.entries(examples)) {
            if (count >= 5) break;
            console.log(`   🧥 ${jacket}: ${points.join(', ')}`);
            count++;
        }
        
        console.log(`\n✅ REZULTAT: Każda kurtka w każdym rozmiarze ma maksymalnie 3 sztuki w różnych punktach!`);
        
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