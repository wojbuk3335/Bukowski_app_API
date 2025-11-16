const mongoose = require('mongoose');

const cudzichTransactionSchema = new mongoose.Schema({
    // Podstawowe informacje o transakcji
    type: {
        type: String,
        required: true,
        enum: ['odbior', 'zwrot', 'wplata', 'wyplata'], // wszystkie typy transakcji
        // odbior: Tomek zabiera kurtkę (+)
        // zwrot: Tomek oddaje kurtkę (-)
        // wplata: Tomek wpłaca pieniądze (-)
        // wyplata: My wypłacamy pieniądze Tomkowi (+)
    },
    
    // Informacje o produkcie (opcjonalne dla wpłat/wypłat)
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Goods',
        required: function() {
            return ['odbior', 'zwrot'].includes(this.type);
        },
    },
    productName: {
        type: String,
        required: function() {
            return ['odbior', 'zwrot'].includes(this.type);
        },
    },
    size: {
        type: String,
        required: function() {
            return ['odbior', 'zwrot'].includes(this.type);
        },
    },
    
    // Informacje cenowe
    price: {
        type: Number,
        required: true,
        min: 0,
        // Cena z cennika Cudzich
    },
    
    // Informacje o użytkowniku/punkcie sprzedaży
    userSymbol: {
        type: String,
        required: true,
        default: 'P', // Punkt sprzedaży P
    },
    sellingPointId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    
    // Informacje o odbiorcy
    recipientName: {
        type: String,
        required: true,
        default: 'Tomasz Cudzich',
    },
    recipientId: {
        type: String,
        required: true,
        default: 'cudzich', // Identyfikator odbiorcy
    },
    
    // Informacje czasowe
    date: {
        type: Date,
        required: true,
        default: Date.now,
    },
    
    // Dodatkowe informacje
    notes: {
        type: String,
        default: '',
    },
    
    // Informacje systemowe
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    
    // Informacje o cenności transakcji (dla historii i auditów)
    priceListSnapshot: {
        sellingPointId: mongoose.Schema.Types.ObjectId,
        sellingPointName: String,
        priceAtTime: Number, // Cena w momencie transakcji
    }
}, {
    timestamps: true, // Dodaje createdAt i updatedAt
    collection: 'cudzichTransactions'
});

// Indeksy dla szybszego wyszukiwania
cudzichTransactionSchema.index({ recipientId: 1, date: -1 });
cudzichTransactionSchema.index({ userSymbol: 1, date: -1 });
cudzichTransactionSchema.index({ type: 1, date: -1 });
cudzichTransactionSchema.index({ productId: 1 });

// Metoda wirtualna do obliczania wpływu na saldo
cudzichTransactionSchema.virtual('balanceImpact').get(function() {
    switch(this.type) {
        case 'odbior':  return this.price;  // +
        case 'wyplata': return this.price;  // +
        case 'zwrot':   return -this.price; // -
        case 'wplata':  return -this.price; // -
        default: return 0;
    }
});

// Metoda statyczna do obliczania salda dla odbiorcy
cudzichTransactionSchema.statics.calculateBalance = async function(recipientId, userSymbol = 'P') {
    const transactions = await this.find({ 
        recipientId: recipientId,
        userSymbol: userSymbol 
    });
    
    return transactions.reduce((balance, transaction) => {
        switch(transaction.type) {
            case 'odbior':  return balance + transaction.price;  // +
            case 'wyplata': return balance + transaction.price;  // +
            case 'zwrot':   return balance - transaction.price;  // -
            case 'wplata':  return balance - transaction.price;  // -
            default: return balance;
        }
    }, 0);
};

// Metoda statyczna do pobierania transakcji z filtrem dat
cudzichTransactionSchema.statics.getTransactionsByDateRange = async function(recipientId, startDate, endDate, userSymbol = 'P') {
    const query = {
        recipientId: recipientId,
        userSymbol: userSymbol
    };
    
    if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = startDate;
        if (endDate) query.date.$lte = endDate;
    }
    
    return await this.find(query)
        .populate('productId', 'fullName category')
        .populate('sellingPointId', 'symbol location')
        .populate('createdBy', 'email symbol')
        .sort({ date: -1 });
};

// Middleware przed zapisem - walidacja
cudzichTransactionSchema.pre('save', function(next) {
    // Walidacja: cena musi być większa od 0
    if (this.price <= 0) {
        next(new Error('Cena musi być większa od 0'));
    }
    
    // Walidacja: productName jest wymagany tylko dla odbior/zwrot
    if (['odbior', 'zwrot'].includes(this.type)) {
        if (!this.productName || this.productName.trim() === '') {
            next(new Error('Nazwa produktu jest wymagana dla odbioru/zwrotu'));
        }
    }
    
    next();
});

// Middleware po zapisie - logowanie (opcjonalne)
cudzichTransactionSchema.post('save', function(doc) {
    console.log(`✅ Zapisano transakcję Cudzich: ${doc.type} - ${doc.productName} - ${doc.price}zł`);
});

module.exports = mongoose.model('CudzichTransaction', cudzichTransactionSchema);