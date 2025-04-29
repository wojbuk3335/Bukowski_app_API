const mongoose = require('mongoose');

const sizeSchema = mongoose.Schema({
    Roz_Kod: {
        type: String,
        required: true
    },
    Roz_Opis: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('Size', sizeSchema);