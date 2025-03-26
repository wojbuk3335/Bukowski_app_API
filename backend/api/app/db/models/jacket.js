const mongoose = require('mongoose');

const jacketSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    name: { type: String, required: true },
    nameID: { type: String, required: true },
    color: { type: String, required: true },
    colorID: { type: String, required: true },
    size: { type: String, required: true },
    sizeID: { type: String, required: true },
    currentStall: { type: String, required: true },
    currentStallID: { type: String, required: true },
    dateOfAdd: { type: Date, required: true },
    defaultPriceKrupowki: { type: Number, required: true },
    defaultPriceGubalowka: { type: Number, required: true },
    defaultPriceKarpacz: { type: Number, required: true }
});

module.exports = mongoose.model('Jacket', jacketSchema);