const mongoose = require('mongoose');

const remainingCategorySchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    Rem_Kat_1_Kod_1: { type: String, required: true, unique: true },
    Rem_Kat_1_Opis_1: { type: String, required: false, default: '' },
    Plec: { type: String, required: false, default: '' },
    number_id: { type: Number }
});

module.exports = mongoose.model('RemainingCategory', remainingCategorySchema);