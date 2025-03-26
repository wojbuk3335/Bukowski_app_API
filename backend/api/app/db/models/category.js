const mongoose = require('mongoose');

const categorySchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    Kat_Kod: { type: String, required: true, unique: true },
    Kat_Opis: { type: String, default: "" },
});

module.exports = mongoose.model('Category', categorySchema);
