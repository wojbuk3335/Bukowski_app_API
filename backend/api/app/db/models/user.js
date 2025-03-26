const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    email: {
        type: String,
        required: true,
        unique: true,
        match: /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/
    },
    password: { type: String, required: true },
    symbol: { type: String, required: true },
    sellingPoint: {
        type: String,
        required: function () { return this.role === 'user'; }, // Required for users
        default: null, // Allow sellingPoint to be null
        validate: {
            validator: async function (value) {
                if (this.role === 'admin') return true;
                const count = await mongoose.models.User.countDocuments({ sellingPoint: value, role: 'user' });
                return count === 0;
            },
            message: 'Selling point must be unique for users.'
        }
    },
    role: {
        type: String,
        required: true,
        enum: ['user', 'admin'],
        default: 'user'
    },
});

module.exports = mongoose.model('User', userSchema);