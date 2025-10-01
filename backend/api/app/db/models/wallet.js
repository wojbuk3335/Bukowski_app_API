const mongoose = require('mongoose');

const walletSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    Torebki_Nr: { 
        type: mongoose.Schema.Types.Mixed, 
        required: true, 
        unique: true 
    },
    Torebki_Kod: { 
        type: mongoose.Schema.Types.Mixed, 
        required: false 
    }
});

module.exports = mongoose.model('Wallet', walletSchema);