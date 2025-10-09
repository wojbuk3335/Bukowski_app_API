const mongoose = require('mongoose');

const glovesSchema = new mongoose.Schema({
  Glove_Kod: {
    type: String,
    required: true,
    unique: true
  },
  Glove_Opis: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Gloves', glovesSchema);