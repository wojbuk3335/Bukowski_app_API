const mongoose = require('mongoose');
const category = require('./category');

const goodsSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    stock: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Stock',
        required: false, // Not required for bags
    },
    color: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Color',
        required: true
    },
    // Fields for bags category
    bagProduct: { type: String, required: false }, // Bag product code
    bagId: { type: String, required: false }, // Bag ID
    bagsCategoryId: { type: String, required: false }, // Bags category ID
    
    fullName: { type: String, required: true, unique: true },
    code: { type: String, required: true, unique: true },
    price: { type: Number, required: true },
    discount_price: { type: Number },
    category: { type: String, required: true }, // Changed to string
    subcategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category', // Reference to the subcategory model
        required: false // Not required for bags
    },
    remainingSubcategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RemainingSubcategory', // Reference to the remaining subcategory model
        required: false // Only for remaining products
    },
    manufacturer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Manufacturer', // Reference to the manufacturer model
        required: false // Optional for all products
    },
    Plec: { type: String, required: false }, // Not required for bags
    picture: { type: String, default: "" },
    priceExceptions: {
        type: [{
            size: { type: mongoose.Schema.Types.ObjectId, ref: 'Size' },
            value: { type: Number }
        }],
        default: []
    },
    symbol: { type: String, required: false, default: '' },
    sellingPoint: { type: String, required: false, default: '' }, // Default to an empty string
    barcode: { type: String, required: false, default: '' }, // Default to an empty string
});

goodsSchema.post('save', function (error, doc, next) {
    if (error.name === 'MongoError' && error.code === 11000) {
        if (error.keyPattern && error.keyPattern.fullName) {
            next(new Error('Podana nazwa produktu już znajduje się w bazie danych!'));
        } else if (error.keyPattern && error.keyPattern.code) {
            next(new Error('Produkt o tym kodzie już znajduje się w bazie danych!'));
        } else {
            next(error);
        }
    } else {
        next(error);
    }
});

module.exports = mongoose.model('Goods', goodsSchema);
