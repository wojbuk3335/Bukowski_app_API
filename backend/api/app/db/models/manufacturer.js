const mongoose = require('mongoose');

const manufacturerSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    Prod_Kod: {
        type: String,
        required: true,
        unique: true
    },
    Prod_Opis: {
        type: String,
        required: false
    }
});

module.exports = mongoose.model('Manufacturer', manufacturerSchema);