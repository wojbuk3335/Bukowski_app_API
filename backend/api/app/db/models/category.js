const mongoose = require('mongoose');

const categorySchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    Kat_1_Kod_1: { type: String, required: true },
    Kat_1_Opis_1: { type: String, unique: true, default: "" },
    Plec: { type: String, default: "" },
});

module.exports = mongoose.model('Category', categorySchema);
