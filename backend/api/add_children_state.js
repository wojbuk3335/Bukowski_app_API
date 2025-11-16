const mongoose = require('mongoose');
const config = require('./app/config');

async function addChildrenState() {
    try {
        console.log('📦 Dodawanie stanu magazynowego dla kamizelek dziecięcych...');
        
        await mongoose.connect(config.database);
        console.log('✅ Połączono z bazą danych');
        
        // Pobierz kamizelki dziecięce
        const Goods = require('./app/db/models/goods');
        const childrenVests = await Goods.find({
            fullName: { $regex: /kamizelka dziecięca/i }
        });
        
        console.log(`📋 Znaleziono ${childrenVests.length} kamizelek dziecięcych`);
        
        // Model stanu magazynowego
        const StateModel = mongoose.model('states', new mongoose.Schema({
            fullName: String,
            size: String,
            sellingPoint: String,
            symbol: String,
            quantity: Number
        }));
        
        // Rozmiary dziecięce: 92, 98, 104, 110, 116, 122, 128, 134, 140, 146, 152, 158, 164
        const childrenSizes = ['92', '98', '104', '110', '116', '122', '128', '134', '140', '146', '152', '158', '164'];
        const sellingPoints = ['Zakopane', 'Karpacz', 'Wszystkie'];
        
        let addedCount = 0;
        
        for (const vest of childrenVests) {
            console.log(`➕ Dodawanie stanu dla: ${vest.fullName}`);
            
            for (const size of childrenSizes) {
                for (const sellingPoint of sellingPoints) {
                    // Sprawdź czy wpis już istnieje
                    const existingState = await StateModel.findOne({
                        fullName: vest.fullName,
                        size: size,
                        sellingPoint: sellingPoint
                    });
                    
                    if (!existingState) {
                        const newState = new StateModel({
                            fullName: vest.fullName,
                            size: size,
                            sellingPoint: sellingPoint,
                            symbol: vest.symbol || `KAM-DZ-${size}`,
                            quantity: 0 // Zaczynamy od 0
                        });
                        
                        await newState.save();
                        addedCount++;
                        
                        // Dodaj specjalny wpis dla rozmiaru 116 z ilością 1
                        if (size === '116' && sellingPoint === 'Zakopane') {
                            newState.quantity = 1;
                            await newState.save();
                            console.log(`  ✅ ${vest.fullName} - rozmiar ${size} (${sellingPoint}) - ilość: 1`);
                        } else {
                            console.log(`  ✅ ${vest.fullName} - rozmiar ${size} (${sellingPoint}) - ilość: 0`);
                        }
                    }
                }
            }
        }
        
        console.log(`\n🎉 PODSUMOWANIE:`);
        console.log(`➕ Dodano ${addedCount} nowych wpisów stanu magazynowego`);
        console.log(`📊 Kamizelka dziecięca rozmiar 116 powinna być teraz widoczna w tabeli!`);
        
        await mongoose.disconnect();
        console.log('🔌 Rozłączono z bazą danych');
        
    } catch (error) {
        console.error('💥 Błąd:', error.message);
        await mongoose.disconnect();
    }
}

addChildrenState();