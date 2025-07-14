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
                if (this.role === 'admin' || this.role === 'magazyn') return true;
                const count = await mongoose.models.User.countDocuments({ sellingPoint: value, role: 'user' });
                return count === 0;
            },
            message: 'Selling point must be unique for users.'
        }
    },
    location: {
        type: String,
        required: function () { return this.role === 'user'; }, // Required for users
        default: null, // Allow location to be null for admin and magazyn
    },
    role: {
        type: String,
        required: true,
        enum: ['user', 'admin', 'magazyn'],
        default: 'user',
        validate: {
            validator: async function (value) {
                if (value !== 'magazyn') return true;
                
                // Check if this is an update and the current document already has role 'magazyn'
                if (this._id) {
                    const currentDoc = await mongoose.models.User.findById(this._id);
                    if (currentDoc && currentDoc.role === 'magazyn') {
                        return true; // Allow updating existing magazyn user
                    }
                }
                
                // Check if there's already a user with role 'magazyn'
                const count = await mongoose.models.User.countDocuments({ role: 'magazyn' });
                return count === 0;
            },
            message: 'Może istnieć tylko jeden użytkownik z rolą magazyn.'
        }
    },
});

module.exports = mongoose.model('User', userSchema);