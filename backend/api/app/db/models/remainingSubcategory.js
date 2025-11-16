const mongoose = require('mongoose');

const remainingSubcategorySchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    categoryId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'RemainingCategory',
        required: true 
    }, // ID kategorii nadrzędnej
    Sub_Kod: { type: String, required: true, unique: true },
    Sub_Opis: { type: String, required: false, default: '' },
    Plec: { type: String, required: false, default: '' },
    number_id: { type: Number }
});

module.exports = mongoose.model('RemainingSubcategory', remainingSubcategorySchema, 'remainingSubcategories');