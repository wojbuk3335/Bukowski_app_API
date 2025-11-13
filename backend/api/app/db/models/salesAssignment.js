const mongoose = require('mongoose');

const salesAssignmentSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    sellingPoint: {
        type: String,
        required: true
    },
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assignedAt: {
        type: Date,
        default: Date.now
    },
    workDate: {
        type: Date,
        required: true,
        default: function() {
            // Ustawienie daty na początek dnia (00:00:00)
            const today = new Date();
            return new Date(today.getFullYear(), today.getMonth(), today.getDate());
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    deactivatedAt: {
        type: Date,
        required: false
    },
    notes: {
        type: String,
        required: false
    }
});

// Index for faster queries
salesAssignmentSchema.index({ sellingPoint: 1, isActive: 1, workDate: 1 });
salesAssignmentSchema.index({ employeeId: 1, isActive: 1, workDate: 1 });
salesAssignmentSchema.index({ workDate: 1 }); // For cleanup operations

// Ensure unique active assignment per employee per selling point per day
salesAssignmentSchema.index(
    { sellingPoint: 1, employeeId: 1, workDate: 1, isActive: 1 }, 
    { 
        unique: true,
        partialFilterExpression: { isActive: true }
    }
);

// Automatyczne usuwanie starych przypisań (TTL - Time To Live)
// Przypisania będą automatycznie usuwane po 7 dniach od workDate
salesAssignmentSchema.index(
    { workDate: 1 }, 
    { expireAfterSeconds: 7 * 24 * 60 * 60 } // 7 dni w sekundach
);

module.exports = mongoose.model('SalesAssignment', salesAssignmentSchema);