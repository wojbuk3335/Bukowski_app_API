const mongoose = require('mongoose');
const category = require('./category');

const goodsSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    stock: {
        type:
            mongoose.Schema.Types.ObjectId,
        ref: 'Stock',
        required: true,
    },
    color: {
        type:
            mongoose.Schema.Types.ObjectId,
        ref: 'Color',
        required: true
    },
    fullName: { type: String, required: true, unique: true },
    code: { type: String, required: true, unique: true },
    price: { type: Number, required: true },
    discount_price: { type: Number },
    category: { type: String, required: true }, // Changed to string
    subcategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category', // Reference to the subcategory model
        required: true
    },
    sex: { type: String, required: true }, // New field for sex
    picture: { type: String, default: "" },
    priceExceptions: {
        type: [{
            size: { type: mongoose.Schema.Types.ObjectId, ref: 'Size' },
            value: { type: Number }
        }],
        default: []
    },
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
