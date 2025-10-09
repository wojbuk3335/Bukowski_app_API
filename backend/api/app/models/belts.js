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
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Belts', beltsSchema);