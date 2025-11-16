const mongoose = require('mongoose');

const operationSchema = new mongoose.Schema({
    operationId: {
        type: String,
        required: true,
        unique: true
    },
    date: {
        type: Date,
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
    status: {
        type: String,
        enum: ['active', 'cancelled'],
        default: 'active'
    },
    userloggedinId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    changes: [{
        type: {
            type: String,
            enum: ['delete_state', 'history_entry'],
            required: true
        },
        originalData: {
            type: mongoose.Schema.Types.Mixed,
            required: true
        },
        changeId: String // For history entries
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Operation', operationSchema);