const mongoose = require('mongoose');

const deductionSchema = new mongoose.Schema({
    userSymbol: {
        type: String,
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    currency: {
        type: String,
        required: true,
        default: 'PLN',
    },
    reason: {
        type: String,
        required: true,
    },
    date: {
        type: Date,
        required: true,
        default: Date.now,
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('Deduction', deductionSchema);
