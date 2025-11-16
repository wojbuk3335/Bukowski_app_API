const mongoose = require('mongoose');

const subcategoryCoatsSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    Kat_1_Kod_1: { type: String, required: true, unique: true },
    Kat_1_Opis_1: { type: String, default: null },
    Plec: { type: String, default: null },
});

module.exports = mongoose.model('SubcategoryCoats', subcategoryCoatsSchema, 'subcategoriesCoats');