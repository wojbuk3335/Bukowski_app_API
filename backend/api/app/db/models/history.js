const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
    collectionName: {
        type: String,
        required: true
    },
    operation: {
        type: String,
        required: true
    },
    from: {
        type: String, // Store "Skąd" as a String
        default: '-' // Ensure default value is "-"
    },
    to: {
        type: String, // Store "Dokąd" as a String
        default: '-' // Ensure default value is "-"
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    product: {
        type: String, // Store product as a String
        default: 'Nieznany produkt' // Ensure default value is "Nieznany produkt"
    },
    size: {
        type: String, // Store size as a String
        default: '-' // Ensure default value is "-"
    },
    details: {
        type: String // Store details as a String
    },
    userloggedinId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' // Ensure reference to the User model
    },
    transactionId: {
        type: String, // Store transaction ID for grouping related operations
        required: false // Not required for backwards compatibility
    }
});

module.exports = mongoose.model('History', historySchema);
