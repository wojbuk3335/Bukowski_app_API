const mongoose = require('mongoose');

const localizationSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    Miejsc_1_Kod_1: { type: String, required: true, unique: true },
    Miejsc_1_Opis_1: { type: String, default: "" },
});

module.exports = mongoose.model('Localization', localizationSchema);
