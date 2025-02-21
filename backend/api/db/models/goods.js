const mongoose = require('mongoose');

const goodsSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    stock: { type: mongoose.Schema.Types.ObjectId, ref: 'Stock', required: true },
    color: { type: mongoose.Schema.Types.ObjectId, ref: 'Color', required: true },
    FullName: { type: String, required: true, unique: true },
    Code: { type: String, required: true, unique: true },
    Picture: { type: String, default: "" },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true }, // Ensure category field is correctly defined
});

module.exports = mongoose.model('Goods', goodsSchema);
