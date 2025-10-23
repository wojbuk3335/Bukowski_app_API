const mongoose = require('mongoose');
const Goods = require('./app/db/models/goods');
const SubcategoryCoats = require('./app/db/models/subcategoryCoats');
const Stock = require('./app/db/models/stock');
const Color = require('./app/db/models/color');
const Manufacturer = require('./app/db/models/manufacturer');

// Wyłącz ostrzeżenie strictQuery
mongoose.set('strictQuery', false);

const manufacturerId = '68eebc6478015550b96ae903'; // R&B
const menSubcategoryId = '68f7db03d1dde0b668d4c378'; // Kurtka męska licówka
const womenSubcategoryId = '68f7d26c5b8f61302b06f658'; // Kurtka damska licówka (lub skórzana damska)

// Sample stocks and colors (używam tych z Twojego przykładu)
const sampleStock = '68eebae78d1d7c9d4d6ae9ca'; // Cinnamon
const sampleColor = '68eebaf28d1d7c9d4d6aea3a'; // BRĄZOWY

const products = [
  // 20 kurtek męskich licówka R&B
  ...Array.from({length: 20}, (_, i) => ({
    _id: new mongoose.Types.ObjectId(),
    stock: sampleStock,
    color: sampleColor,
    fullName: `R&B Męska Licówka ${i + 1} BRĄZOWY`,
    code: `RB${(1000 + i).toString().padStart(4, '0')}M00001`,
    category: 'Kurtki kożuchy futra',
    subcategory: menSubcategoryId,
    manufacturer: manufacturerId,
    price: 999 + (i * 10), // Różne ceny 999-1189
    discount_price: 0,
    picture: '',
    priceExceptions: [],
    sellingPoint: '',
    barcode: '',
    Plec: 'M',
    priceKarpacz: 0,
    discount_priceKarpacz: 0,
    priceExceptionsKarpacz: [],
    rowBackgroundColor: '#ffffff',
    isSelectedForPrint: false
  })),
  
  // 20 kurtek damskich licówka R&B
  ...Array.from({length: 20}, (_, i) => ({
    _id: new mongoose.Types.ObjectId(),
    stock: sampleStock,
    color: sampleColor,
    fullName: `R&B Damska Licówka ${i + 1} BRĄZOWY`,
    code: `RB${(2000 + i).toString().padStart(4, '0')}D00001`,
    category: 'Kurtki kożuchy futra',
    subcategory: womenSubcategoryId,
    manufacturer: manufacturerId,
    price: 899 + (i * 10), // Różne ceny 899-1089
    discount_price: 0,
    picture: '',
    priceExceptions: [],
    sellingPoint: '',
    barcode: '',
    Plec: 'D',
    priceKarpacz: 0,
    discount_priceKarpacz: 0,
    priceExceptionsKarpacz: [],
    rowBackgroundColor: '#ffffff',
    isSelectedForPrint: false
  }))
];

async function addRBProducts() {
  try {
    // Używamy tej samej bazy co aplikacja
    const config = require('./app/config');
    await mongoose.connect(config.database);
    console.log('✅ Połączono z MongoDB Atlas');
    
    // Sprawdź czy produkty R&B już istnieją
    const existingRB = await Goods.find({ manufacturer: manufacturerId });
    console.log(`Existing R&B products: ${existingRB.length}`);
    
    if (existingRB.length >= 40) {
      console.log('⚠️ Already have 40+ R&B products. Skipping...');
      process.exit(0);
    }
    
    // Dodaj produkty
    const result = await Goods.insertMany(products);
    console.log(`✅ Successfully added ${result.length} R&B products!`);
    
    // Pokaż statystyki
    const rbProducts = await Goods.find({ manufacturer: manufacturerId });
    const menCount = rbProducts.filter(p => p.Plec === 'M').length;
    const womenCount = rbProducts.filter(p => p.Plec === 'D').length;
    
    console.log(`📊 Total R&B products: ${rbProducts.length}`);
    console.log(`👨 Men: ${menCount}`);
    console.log(`👩 Women: ${womenCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding R&B products:', error);
    process.exit(1);
  }
}

addRBProducts();