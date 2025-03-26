const mongoose = require('mongoose');

const sizeSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    Roz_Kod: { type: String, required: true, unique: true },
    Roz_Opis: { type: String, default: "" },
});

module.exports = mongoose.model('Size', sizeSchema);