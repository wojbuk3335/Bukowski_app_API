const mongoose = require('mongoose');

const remanentItemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    code: {
        type: String,
        required: true,
        trim: true
    },
    quantity: {
        type: Number,
        required: true,
        default: 1
    },
    value: {
        type: Number,
        required: true,
        default: 0
    },
    location: {
        type: String,
        required: true,
        trim: true
    },
    scannedBy: {
        type: String,
        required: true,
        trim: true
    },
    scannedAt: {
        type: Date,
        required: true,
        default: Date.now
    }
}, { _id: true });

const remanentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sellingPoint: {
        type: String,
        required: true,
        trim: true
    },
    items: [remanentItemSchema],
    timestamp: {
        type: Date,
        required: true,
        default: Date.now
    },
    totalItems: {
        type: Number,
        default: 0
    },
    totalValue: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Calculate totals before saving
remanentSchema.pre('save', function(next) {
    this.totalItems = this.items.length;
    this.totalValue = this.items.reduce((sum, item) => sum + (item.value || 0), 0);
    next();
});

// Index for efficient queries
remanentSchema.index({ userId: 1, timestamp: -1 });
remanentSchema.index({ sellingPoint: 1, timestamp: -1 });
remanentSchema.index({ 'items.code': 1 });

module.exports = mongoose.model('Remanent', remanentSchema);