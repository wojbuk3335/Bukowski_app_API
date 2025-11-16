const mongoose = require('mongoose');
require('./app/config');
const State = require('./app/db/models/state');
const Transfer = require('./app/db/models/transfer');
const History = require('./app/db/models/history');

async function checkIncomingCodes() {
  try {
    console.log('🔍 Checking database connection...');
    
    // Znajdź wszystkie stany z kodami INCOMING
    const incomingStates = await State.find({
      barcode: { $regex: '^INCOMING_' }
    }).populate('fullName').populate('size').populate('sellingPoint');
    
    console.log(`\n📦 FOUND ${incomingStates.length} INCOMING STATES:`);
    
    for (let state of incomingStates) {
      console.log('\n' + '='.repeat(50));
      console.log('STATE ID:', state._id);
      console.log('BARCODE:', state.barcode);
      console.log('PRODUCT:', state.fullName ? state.fullName.name : 'PRODUCT NOT FOUND');
      console.log('SIZE:', state.size ? state.size.name : 'NO SIZE');
      console.log('SELLING POINT:', state.sellingPoint ? state.sellingPoint.symbol : 'NO SELLING POINT');
      console.log('DATE:', state.date);
      
      // Sprawdź historię dla tego stanu
      const relatedHistory = await History.find({
        'details': { $regex: state._id.toString() }
      });
      
      console.log('RELATED HISTORY ENTRIES:', relatedHistory.length);
      relatedHistory.forEach(h => {
        console.log('  - Operation:', h.operation);
        console.log('  - Product:', h.product);
        console.log('  - Timestamp:', h.timestamp);
      });
    }
    
    // Sprawdź także transfery z yellowProcessed = true
    const yellowTransfers = await Transfer.find({
      yellowProcessed: true
    }).populate('productId').sort({ yellowProcessedAt: -1 }).limit(10);
    
    console.log(`\n🟡 RECENT YELLOW PROCESSED TRANSFERS (${yellowTransfers.length}):`);
    
    for (let transfer of yellowTransfers) {
      console.log('\n' + '-'.repeat(40));
      console.log('TRANSFER ID:', transfer._id);
      console.log('ROUTE:', `${transfer.transfer_from} → ${transfer.transfer_to}`);
      console.log('PRODUCT:', transfer.productId ? transfer.productId.name : 'PRODUCT NOT FOUND');
      console.log('SIZE:', transfer.size);
      console.log('YELLOW PROCESSED AT:', transfer.yellowProcessedAt);
      console.log('BLUE PROCESSED:', transfer.blueProcessed);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    process.exit();
  }
}

checkIncomingCodes();