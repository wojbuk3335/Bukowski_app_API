const mongoose = require('mongoose');

const stockSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    Tow_Kod: { type: String, required: true, unique: true },
    Tow_Opis: { type: String, required: true, default: "" },
});

module.exports = mongoose.model('Stock', stockSchema);