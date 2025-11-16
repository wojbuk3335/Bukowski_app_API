const mongoose = require('mongoose');

const priceListItemSchema = new mongoose.Schema({
    // Reference to original goods item
    originalGoodId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'goods',
        required: true
    },
    
    // Product details (copied from goods for performance)
    stock: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Stock'
    },
    color: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Color'
    },
    fullName: String,
    code: String,
    category: String,
    subcategory: {
        type: mongoose.Schema.Types.Mixed, // Changed to Mixed to handle ObjectId and strings (belts/gloves)
        required: false
    },
    bagsCategoryId: {
        type: mongoose.Schema.Types.Mixed, // Changed to Mixed to handle both BagsCategory and WalletsCategory references
        required: false
    },
    remainingsubsubcategory: {
        type: String
    },
    manufacturer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Manufacturer'
    },
    picture: String,
    bagProduct: String,
    
    // Custom pricing for this selling point
    price: {
        type: Number,
        default: 0
    },
    discountPrice: {
        type: Number,
        default: 0
    },
    priceExceptions: [{
        size: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Size'
        },
        value: {
            type: Number,
            required: true
        }
    }],
    
    // Metadata
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

const priceListSchema = new mongoose.Schema({
    sellingPointId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true,
        unique: true
    },
    sellingPointName: {
        type: String,
        required: true
    },
    items: [priceListItemSchema],
    
    // Metadata
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt field before saving
priceListSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('PriceList', priceListSchema);