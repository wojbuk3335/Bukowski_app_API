const mongoose = require('mongoose');

const colorSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    Kol_Kod: { type: String, required: true, unique: true },
    Kol_Opis: { type: String, default: "" },
});

module.exports = mongoose.model('Color', colorSchema);