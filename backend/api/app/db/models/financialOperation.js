const mongoose = require('mongoose');

const financialOperationSchema = new mongoose.Schema({
    userSymbol: {
        type: String,
        required: true,
    },
    amount: {
        type: Number,
        required: true,
        // Positive for additions (deposits, payments received, refunds)
        // Negative for deductions (withdrawals, expenses, advances taken)
    },
    currency: {
        type: String,
        required: true,
        default: 'PLN',
    },
    type: {
        type: String,
        required: true,
        enum: ['addition', 'deduction', 'advance_taken', 'advance_payment', 'purchase', 'refund', 'deposit', 'withdrawal'],
        // addition: Dopisanie kwoty (+)
        // deduction: Odpisanie kwoty (-)
        // advance_taken: Wzięta zaliczka (-)
        // advance_payment: Wpłacona zaliczka (+)
        // purchase: Zakup (-)
        // refund: Zwrot (+)
        // deposit: Wpłata (+)
        // withdrawal: Wypłata (-)
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

module.exports = mongoose.model('FinancialOperation', financialOperationSchema);