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
    timestamp: {
        type: Date,
        default: Date.now
    },
    details: {
        type: String // Store details as a String
    },
    userloggedinId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' // Reference to the User model
    }
});

module.exports = mongoose.model('History', historySchema);
