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
                price: { type: Number, required: true },
                currency: { type: String, required: true }
            }
        ],
        required: false,
        default: []
    },
    card: {
        type: [
            {
                price: { type: Number, required: true },
                currency: { type: String, required: true }
            }
        ],
        required: false,
        default: []
    },
    date: {
        type: Date,
        required: true
    }
});

module.exports = mongoose.model('Sales', salesSchema);