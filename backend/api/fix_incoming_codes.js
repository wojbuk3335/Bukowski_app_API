const mongoose = require('mongoose');
require('./app/config');
const State = require('./app/db/models/state');
const Goods = require('./app/db/models/goods');

async function fixIncomingCodes() {
  try {
    console.log('🔍 Starting fix for INCOMING codes...');
    
    // Poczekaj na połączenie
    await new Promise((resolve, reject) => {
      if (mongoose.connection.readyState === 1) {
        resolve();
      } else {
        mongoose.connection.once('connected', resolve);
        mongoose.connection.once('error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 15000);
      }
    });
    
    console.log('✅ Connected to database');
    
    // Znajdź wszystkie stany z błędnymi kodami INCOMING
    const wrongIncomingStates = await State.find({
      barcode: { $regex: '^INCOMING_' }
    }).populate('fullName');
    
    console.log(`📦 Found ${wrongIncomingStates.length} states with wrong INCOMING codes`);
    
    let fixedCount = 0;
    let errorCount = 0;
    
    for (let state of wrongIncomingStates) {
      try {
        if (!state.fullName) {
          console.log(`❌ State ${state._id} has no fullName reference, skipping`);
          errorCount++;
          continue;
        }
        
        const goods = state.fullName;
        const correctBarcode = goods.code;
        
        if (!correctBarcode) {
          console.log(`❌ Product ${goods.name} has no code, skipping state ${state._id}`);
          errorCount++;
          continue;
        }
        
        console.log(`🔧 Fixing state ${state._id}:`);
        console.log(`   Wrong code: ${state.barcode}`);
        console.log(`   Correct code: ${correctBarcode}`);
        console.log(`   Product: ${goods.name}`);
        
        // Sprawdź czy już istnieje stan z poprawnym kodem dla tego samego użytkownika i produktu
        const existingState = await State.findOne({
          barcode: correctBarcode,
          sellingPoint: state.sellingPoint,
          fullName: state.fullName,
          size: state.size
        });
        
        if (existingState) {
          console.log(`⚠️  State with correct barcode already exists, removing duplicate with wrong code`);
          await State.findByIdAndDelete(state._id);
          console.log(`🗑️  Deleted duplicate state ${state._id}`);
        } else {
          // Popraw kod kreskowy
          await State.findByIdAndUpdate(state._id, {
            barcode: correctBarcode
          });
          console.log(`✅ Updated barcode for state ${state._id}`);
        }
        
        fixedCount++;
        
      } catch (error) {
        console.error(`❌ Error fixing state ${state._id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`✅ Fixed: ${fixedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📦 Total processed: ${wrongIncomingStates.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    process.exit();
  }
}

fixIncomingCodes();