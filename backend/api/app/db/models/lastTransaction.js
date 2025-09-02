const mongoose = require('mongoose');

const lastTransactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  itemCount: {
    type: Number,
    required: true,
    default: 0
  },
  transactionType: {
    type: String,
    enum: ['transfer', 'sale', 'mixed', 'incoming'],
    required: true
  },
  canUndo: {
    type: Boolean,
    default: true
  },
  userSymbol: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

// Index dla szybkiego wyszukiwania ostatniej transakcji
lastTransactionSchema.index({ timestamp: -1 });
lastTransactionSchema.index({ transactionId: 1 });

module.exports = mongoose.model('LastTransaction', lastTransactionSchema);
