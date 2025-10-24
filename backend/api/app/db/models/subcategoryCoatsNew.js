const mongoose = require('mongoose');

const subcategoryCoatsNewSchema = mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String },
    created: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SubcategoryCoatsNew', subcategoryCoatsNewSchema, 'subcategorycoats');