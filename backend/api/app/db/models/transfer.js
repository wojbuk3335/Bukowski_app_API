const mongoose = require('mongoose');

const transferSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
    },
    size: {
        type: String,
        required: true,
    },
    date: {
        type: Date,
        required: true,
    },
    transfer_from: {
        type: String,
        required: true,
    },
    transfer_to: {
        type: String,
        required: true,
    },
    productId: {
        type: String,
        required: true, // Make it required since we need it for compound index
    },
    dateString: {
        type: String,
        required: true, // Store date in YYYY-MM-DD format for compound index
    },
    reason: {
        type: String,
        required: false, // Optional field for Dom transfers
        default: null,
    },
    advancePayment: {
        type: Number,
        required: false, // Optional field for Dom transfers
        default: 0,
    },
    advancePaymentCurrency: {
        type: String,
        required: false, // Optional field for Dom transfers
        default: 'PLN',
    },
    blueProcessed: {
        type: Boolean,
        default: false, // Track if blue transfer (removal from source) has been processed
    },
    blueProcessedAt: {
        type: Date,
        required: false, // When the blue transfer was processed (removal from source)
    },
    yellowProcessed: {
        type: Boolean,
        default: false, // Track if yellow transfer (addition to destination) has been processed
    },
    yellowProcessedAt: {
        type: Date,
        required: false, // When the yellow transfer was processed (addition to destination)
    },
}, {
    timestamps: true,
});

// Create compound unique index: one product can only have one transfer per day
transferSchema.index({ productId: 1, dateString: 1 }, { unique: true });

// Add a static method to delete a transfer by productId
transferSchema.statics.deleteByProductId = async function (productId) {
    return this.findOneAndDelete({ productId }); // Delete transfer by productId
};

module.exports = mongoose.model('Transfer', transferSchema);
