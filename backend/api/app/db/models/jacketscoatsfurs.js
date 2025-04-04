const mongoose = require('mongoose');

const jacketsCoatsFursSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    Kat_1_Kod_1: { type: String, required: true, unique: true },
    Kat_1_Opis_1: { type: String, default: "" },
    Plec: { type: String, default: "" },
});

module.exports = mongoose.model('JacketsCoatsFurs', jacketsCoatsFursSchema);
