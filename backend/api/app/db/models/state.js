const mongoose = require('mongoose');

const stateSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    fullName: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    sellingPoint: {
        type: String,
        required: true // Ensure this field is required
    },
    barcode: {
        type: String,
        required: true // Ensure this field is required
    },
    size: {
        type: String,
        required: true // Ensure this field is required
    }
});

module.exports = mongoose.model('State', stateSchema);