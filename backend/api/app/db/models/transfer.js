const mongoose = require("mongoose");

const transferSchema = new mongoose.Schema({
    productId: { type: String, required: true, unique: true }, // Ensure a product can only be transferred once
    fullName: { type: String, required: true },
    size: { type: String, required: true },
    from: { type: String, required: true }, // Source account (symbol)
    to: { type: String, required: true }, // Destination account (symbol)
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Transfer", transferSchema);
