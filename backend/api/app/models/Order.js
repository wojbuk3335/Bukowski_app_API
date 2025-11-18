const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  product: {
    name: String,
    color: String,
    size: String,
    description: String
  },
  customer: {
    name: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    email: String,
    deliveryOption: {
      type: String,
      enum: ['shipping', 'delivery', 'pickup'],
      required: true,
      default: 'pickup'
    },
    address: {
      postalCode: String, // Not required for 'delivery' and 'pickup' options
      city: String, // Required for 'shipping' and 'delivery' options
      street: String,
      houseNumber: String
    }
  },
  payment: {
    totalPrice: {
      type: Number,
      required: true
    },
    deposit: {
      type: Number,
      default: 0
    },
    depositCurrency: {
      type: String,
      default: 'PLN'
    },
    cashOnDelivery: {
      type: Number,
      required: true
    },
    documentType: {
      type: String,
      enum: ['receipt', 'invoice'],
      default: 'receipt'
    },
    nip: String
  },
  realizationDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'zrealizowano'],
    default: 'pending'
  },
  shippingDate: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  createdBy: String,
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update updatedAt on save
OrderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Order', OrderSchema);