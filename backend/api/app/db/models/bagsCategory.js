const mongoose = require('mongoose');

const bagsCategorySchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    Kat_1_Kod_1: { type: String, required: true, unique: true },
    Kat_1_Opis_1: { type: String, required: false, default: '' },
    Plec: { type: String, required: false, default: '' },
    number_id: { type: Number }
});

module.exports = mongoose.model('BagsCategory', bagsCategorySchema);