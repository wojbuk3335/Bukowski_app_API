const mongoose = require('mongoose');
const Goods = require('./goods');
const Size = require('./size');

const stateSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    fullName: {
        //relation Goods
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Goods',
        required: true,
    },
    goods: {
        //alias for fullName for compatibility with transferProcessing
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Goods',
        required: false,
    },
    date: {
        type: Date,
        required: true
    },    
    size: {
        //relation Size
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Size',
        required: false // Not required for bags
    },
    symbol: {
        type: String,
        required: true // np. "Magazyn główny", "Regal 2", itp.
    },
    barcode: {
        type: String,
    },
    movementType: {
        type: String,
        enum: ['IN', 'OUT', 'TRANSFER'], // przyjęcie, wydanie, przesunięcie
        required: true
    },
    note: {
        type: String // dodatkowe uwagi
    },
    suppliter: {
        type: String // np. nazwa dostawcy
    },
});

stateSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Warehouse', stateSchema);