const mongoose = require('mongoose');

const salesSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    fullName: {
        type: String, // Ensure fullName is a String
        required: true
    },
    timestamp: {
        type: Date,
        required: true
    },
    barcode: {
        type: String,
        required: true
    },
    size: {
        type: String,
        required: true
    },
    sellingPoint: {
        type: String, // Ensure sellingPoint is a String
        required: true
    },
    from: {
        type: String,
        required: true
    },
    cash: {
        type: [
            {
                price: { type: Number, required: false, default: 0 },
                currency: { type: String, required: true }
            }
        ],
        required: false,
        default: []
    },
    card: {
        type: [
            {
                price: { type: Number, required: false, default: 0 },
                currency: { type: String, required: true }
            }
        ],
        required: false,
        default: []
    },
    symbol: {
        type: String, // Ensure symbol is a String
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    processed: {
        type: Boolean,
        default: false
    },
    processedAt: {
        type: Date,
        default: null
    },
    source: {
        type: String,
        required: false,
        default: null
    },
    notes: {
        type: String,
        required: false,
        default: null
    }
});

module.exports = mongoose.model('Sales', salesSchema);