const mongoose = require('mongoose');

const remainingProductsSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    Poz_Nr: { 
        type: mongoose.Schema.Types.Mixed, 
        required: true, 
        unique: true 
    },
    Poz_Kod: { 
        type: mongoose.Schema.Types.Mixed, 
        required: false 
    }
});

module.exports = mongoose.model('RemainingProducts', remainingProductsSchema, 'remainingProducts');