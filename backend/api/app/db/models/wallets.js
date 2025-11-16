const mongoose = require('mongoose');

const walletsSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    Portfele_Nr: { 
        type: mongoose.Schema.Types.Mixed, 
        required: true, 
        unique: true 
    },
    Portfele_Kod: { 
        type: mongoose.Schema.Types.Mixed, 
        required: false 
    }
});

module.exports = mongoose.model('Wallets', walletsSchema, 'wallets');