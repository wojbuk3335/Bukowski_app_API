const mongoose = require('mongoose');

const beltsSchema = new mongoose.Schema({
  Belt_Kod: {
    type: String,
    required: true,
    unique: true
  },
  Belt_Opis: {
    type: String,
    required: false
  },
  Rodzaj: {
    type: String,
    enum: ['D', 'M'],
    required: false,
    default: 'D'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Belts', beltsSchema);