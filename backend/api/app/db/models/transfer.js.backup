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
        unique: true, // Ensure uniqueness
        sparse: true, // Allow null values without triggering uniqueness errors
    },
}, {
    timestamps: true,
});

// Add a static method to delete a transfer by productId
transferSchema.statics.deleteByProductId = async function (productId) {
    return this.findOneAndDelete({ productId }); // Delete transfer by productId
};

module.exports = mongoose.model('Transfer', transferSchema);
