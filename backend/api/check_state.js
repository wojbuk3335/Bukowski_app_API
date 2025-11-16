const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/bukowski_app');

const stateSchema = new mongoose.Schema({}, { collection: 'states', strict: false });
const State = mongoose.model('State', stateSchema);

const productSchema = new mongoose.Schema({}, { collection: 'products', strict: false });
const Product = mongoose.model('Product', productSchema);

const sizeSchema = new mongoose.Schema({}, { collection: 'sizes', strict: false });
const Size = mongoose.model('Size', sizeSchema);

setTimeout(async () => {
  try {
    const states = await State.find({});
    
    console.log('=== PRODUKTY NA STANIE ===');
    let adaCount = 0;
    let judytaCount = 0;
    
    for (let state of states) {
      if (state.fullName && state.size) {
        const product = await Product.findById(state.fullName);
        const size = await Size.findById(state.size);
        
        if (product && size && (product.name === 'Ada' || product.name === 'Judyta')) {
          console.log(`${product.name} ${product.color} ${size.name} - ID: ${state._id} - Barcode: ${state.barcode}`);
          
          if (product.name === 'Ada' && product.color === 'CZERWONY' && size.name === '2XL') {
            adaCount++;
          }
          if (product.name === 'Judyta' && product.color === 'BIAŁY' && size.name === '2XL') {
            judytaCount++;
          }
        }
      }
    }
    
    console.log('\n=== PODSUMOWANIE ===');
    console.log(`Ada CZERWONY 2XL na stanie: ${adaCount}`);
    console.log(`Judyta BIAŁY 2XL na stanie: ${judytaCount}`);
    console.log('\n=== DO ODPISANIA ===');
    console.log('Ada CZERWONY 2XL: 4 operacje (3 sprzedaże + 1 transfer)');
    console.log('Judyta BIAŁY 2XL: 1 operacja (1 transfer)');
    
    console.log('\n=== CO POWINNO TRAFIĆ DO KOREKT ===');
    const adaToCorrections = Math.max(0, 4 - adaCount);
    const judytaToCorrections = Math.max(0, 1 - judytaCount);
    
    console.log(`Ada CZERWONY 2XL: ${adaToCorrections} operacji do korekt (${adaCount} na stanie - 4 do odpisania)`);
    console.log(`Judyta BIAŁY 2XL: ${judytaToCorrections} operacji do korekt (${judytaCount} na stanie - 1 do odpisania)`);
    
    mongoose.connection.close();
  } catch(e) {
    console.error(e);
    mongoose.connection.close();
  }
}, 1000);