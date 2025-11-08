const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
    _id: {
        type: mongoose.Schema.Types.ObjectId,
        default: () => new mongoose.Types.ObjectId()
    },
    employeeId: {
        type: String,
        required: true,
        unique: true,
        match: /^EMP\d{3}$/
    },
    firstName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50
    },
    lastName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50
    },
    position: {
        type: String,
        trim: true,
        maxlength: 100,
        default: ''
    },
    hourlyRate: {
        type: Number,
        min: 0,
        default: 0
    },
    salesCommission: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    notes: {
        type: String,
        trim: true,
        maxlength: 500,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Middleware do aktualizacji updatedAt przed zapisem
employeeSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Middleware do aktualizacji updatedAt przed aktualizacją
employeeSchema.pre('findOneAndUpdate', function(next) {
    this.set({ updatedAt: new Date() });
    next();
});

// Virtual property for full name
employeeSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Ensure virtual fields are serialised
employeeSchema.set('toJSON', {
    virtuals: true
});

module.exports = mongoose.model('Employee', employeeSchema);