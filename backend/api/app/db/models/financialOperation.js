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
        enum: ['addition', 'deduction', 'advance_taken', 'advance_payment', 'purchase', 'refund', 'deposit', 'withdrawal', 'employee_advance', 'salary_payment'],
        // addition: Dopisanie kwoty (+)
        // deduction: Odpisanie kwoty (-)
        // advance_taken: Wzięta zaliczka (-)
        // advance_payment: Wpłacona zaliczka (+)
        // purchase: Zakup (-)
        // refund: Zwrot (+)
        // deposit: Wpłata (+)
        // withdrawal: Wypłata (-)
        // employee_advance: Zaliczka dla pracownika (-)
        // salary_payment: Wypłata pensji dla pracownika (-)
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
    // Additional fields for product-related transactions
    productId: {
        type: String,
        required: false,
        // ID of the product if this is a product-related transaction
    },
    productName: {
        type: String,
        required: false,
        // Name of the product if this is a product-related transaction
    },
    finalPrice: {
        type: Number,
        required: false,
        // Final agreed price for the product
    },
    remainingAmount: {
        type: Number,
        required: false,
        // Amount still to be paid (finalPrice - amount paid so far)
    },
    // Employee advance fields
    employeeId: {
        type: String,
        required: false,
        // ID of the employee for employee_advance type
    },
    employeeName: {
        type: String,
        required: false,
        // Name of the employee for employee_advance type
    },
    employeeCode: {
        type: String,
        required: false,
        // Employee code for employee_advance type
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('FinancialOperation', financialOperationSchema);