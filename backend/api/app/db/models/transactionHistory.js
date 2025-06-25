const mongoose = require('mongoose');

const transactionHistorySchema = new mongoose.Schema({
    transactionId: {
        type: String,
        required: true,
        unique: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    operationType: {
        type: String,
        required: true,
        enum: ['sprzedaz', 'przepisanie']
    },
    selectedSellingPoint: {
        type: String
    },
    targetSellingPoint: {
        type: String
    },
    targetSymbol: {
        type: String
    },
    processedItems: [{
        fullName: String,
        size: String,
        barcode: String,
        price: Number,
        discount_price: Number,
        processType: {
            type: String,
            enum: ['sold', 'synchronized', 'transferred']
        },
        originalId: String,
        originalSymbol: String,
        sellingPoint: String
    }],
    itemsCount: {
        type: Number,
        required: true
    },
    userloggedinId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    isActive: {
        type: Boolean,
        default: true
    }
});

module.exports = mongoose.model('TransactionHistory', transactionHistorySchema);
