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
        required: false // Size is optional (null for bags)
    },
    sellingPoint: {
        //relation Size
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true // Ensure this field is required
    },
    price: {
        type: Number,
        required: true // Ensure this field is required
    },
    discount_price: {
        type: Number,
        required: false // Not always present
    }
});

// Export the model, checking if it already exists to avoid compilation errors in tests
module.exports = (mongoose.models && mongoose.models.State) || mongoose.model('State', stateSchema);