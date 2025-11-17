const mongoose = require('mongoose');

const panKazekSchema = mongoose.Schema({
    _id: {
        type: mongoose.Schema.Types.ObjectId,
        default: () => new mongoose.Types.ObjectId()
    },
    productId: {
        type: String,
        required: true,
        unique: true
    },
    fullName: {
        type: String,
        required: true
    },
    size: {
        type: String,
        required: true
    },
    price: {
        type: String,
        default: '0'
    },
    barcode: {
        type: String,
        default: ''
    },
    date: {
        type: Date,
        default: Date.now
    },
    dateString: {
        type: String,
        default: () => new Date().toISOString().split('T')[0]
    },
    addedBy: {
        type: String,
        required: true
    },
    symbol: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'paid'],
        default: 'pending'
    },
    paidAt: {
        type: Date,
        default: null
    },
    paidBy: {
        type: String,
        default: null
    },
    paidAmount: {
        type: Number,
        default: null
    },
    totalItemsCount: {
        type: Number,
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('PanKazek', panKazekSchema, 'panKazek');
