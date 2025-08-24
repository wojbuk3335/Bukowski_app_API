const mongoose = require('mongoose');

const correctionsSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    fullName: {
        type: String,
        required: true
    },
    size: {
        type: String,
        required: true
    },
    barcode: {
        type: String,
        required: true
    },
    sellingPoint: {
        type: String,
        required: true
    },
    symbol: {
        type: String,
        required: true
    },
    errorType: {
        type: String,
        required: true,
        enum: ['MISSING_IN_STATE', 'DOUBLE_ENTRY', 'WRONG_LOCATION', 'OTHER'],
        default: 'MISSING_IN_STATE'
    },
    description: {
        type: String,
        required: false
    },
    attemptedOperation: {
        type: String,
        required: true,
        enum: ['WRITE_OFF', 'TRANSFER', 'SALE', 'OTHER'],
        default: 'WRITE_OFF'
    },
    status: {
        type: String,
        required: true,
        enum: ['PENDING', 'RESOLVED', 'IGNORED'],
        default: 'PENDING'
    },
    createdAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    resolvedAt: {
        type: Date,
        required: false
    },
    resolvedBy: {
        type: String,
        required: false
    },
    originalPrice: {
        type: Number,
        required: false
    },
    discountPrice: {
        type: Number,
        required: false
    },
    transactionId: {
        type: String,
        required: false
    }
});

module.exports = mongoose.model('Corrections', correctionsSchema);
