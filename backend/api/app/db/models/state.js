const mongoose = require('mongoose');
const Goods = require('./goods');
const Size = require('./size');

const stateSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    fullName: {
        //relation Goods
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Goods',
        required: true, // Ensure this field is required
    },
    date: {
        type: Date,
        required: true
    },
    barcode: {
        type: String,
        required: true // Ensure this field is required
    },
    size: {
        //relation Size
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Size',
        required: true // Ensure this field is required
    },
    sellingPoint: {
        //relation Size
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true // Ensure this field is required
    }
});

module.exports = mongoose.model('State', stateSchema);