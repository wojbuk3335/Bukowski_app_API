const CudzichTransaction = require('../db/models/cudzichTransaction');
const PriceList = require('../db/models/priceList');
const Goods = require('../db/models/goods');
const User = require('../db/models/user');

class CudzichTransactionController {
    // Pobierz wszystkie transakcje dla Cudzich
    getCudzichTransactions = async (req, res) => {
        try {
            const { recipientId = 'cudzich', userSymbol = 'P', startDate, endDate, type } = req.query;
            
            let query = {
                recipientId: recipientId,
                userSymbol: userSymbol
            };
            
            // Filtrowanie po typie transakcji
            if (type && ['odbior', 'zwrot'].includes(type)) {
                query.type = type;
            }
            
            // Filtrowanie po dacie
            if (startDate || endDate) {
                query.date = {};
                if (startDate) {
                    query.date.$gte = new Date(startDate);
                }
                if (endDate) {
                    const endOfDay = new Date(endDate);
                    endOfDay.setHours(23, 59, 59, 999);
                    query.date.$lte = endOfDay;
                }
            }
            
            const transactions = await CudzichTransaction.find(query)
                .populate('productId', 'fullName category')
                .populate('sellingPointId', 'symbol location')
                .populate('createdBy', 'email symbol')
                .sort({ date: -1 });
            
            res.status(200).json(transactions);
        } catch (error) {
            console.error('❌ Błąd pobierania transakcji Cudzich:', error);
            res.status(500).json({ error: error.message });
        }
    };
    
    // Pobierz saldo dla Cudzich
    getCudzichBalance = async (req, res) => {
        try {
            const { recipientId = 'cudzich', userSymbol = 'P' } = req.query;
            
            const balance = await CudzichTransaction.calculateBalance(recipientId, userSymbol);
            
            // Pobierz także statystyki
            const stats = await CudzichTransaction.aggregate([
                { $match: { recipientId: recipientId, userSymbol: userSymbol } },
                {
                    $group: {
                        _id: '$type',
                        count: { $sum: 1 },
                        totalAmount: { $sum: '$price' }
                    }
                }
            ]);
            
            const result = {
                balance: balance,
                recipientId: recipientId,
                userSymbol: userSymbol,
                stats: {
                    odbior: { count: 0, totalAmount: 0 },
                    zwrot: { count: 0, totalAmount: 0 }
                }
            };
            
            stats.forEach(stat => {
                result.stats[stat._id] = {
                    count: stat.count,
                    totalAmount: stat.totalAmount
                };
            });
            
            res.status(200).json(result);
        } catch (error) {
            console.error('❌ Błąd obliczania salda Cudzich:', error);
            res.status(500).json({ error: error.message });
        }
    };
    
    // Utwórz nową transakcję Cudzich
    createCudzichTransaction = async (req, res) => {
        try {
            const {
                type, // 'odbior' lub 'zwrot'
                productId,
                productName,
                size,
                price,
                userSymbol = 'P',
                recipientId = 'cudzich',
                notes = ''
            } = req.body;
            
            // Walidacja wymaganych pól
            if (!type || price === undefined) {
                return res.status(400).json({
                    error: 'Wymagane pola: type, price'
                });
            }
            
            // Walidacja pól produktu dla odbior/zwrot
            if (['odbior', 'zwrot'].includes(type)) {
                if (!productId || !productName || !size) {
                    return res.status(400).json({
                        error: 'Dla odbioru/zwrotu wymagane: productId, productName, size'
                    });
                }
            }
            
            // Walidacja typu
            if (!['odbior', 'zwrot', 'wplata', 'wyplata'].includes(type)) {
                return res.status(400).json({
                    error: 'Typ musi być "odbior", "zwrot", "wplata" lub "wyplata"'
                });
            }
            
            // Walidacja ceny
            if (price <= 0) {
                return res.status(400).json({
                    error: 'Cena musi być większa od 0'
                });
            }
            
            // Znajdź użytkownika/punkt sprzedaży
            const sellingPoint = await User.findOne({ symbol: userSymbol });
            if (!sellingPoint) {
                return res.status(404).json({
                    error: `Nie znaleziono punktu sprzedaży o symbolu: ${userSymbol}`
                });
            }
            
            // Sprawdź czy produkt istnieje (tylko dla odbior/zwrot)
            if (['odbior', 'zwrot'].includes(type)) {
                const product = await Goods.findById(productId);
                if (!product) {
                    return res.status(404).json({
                        error: 'Nie znaleziono produktu'
                    });
                }
            }
            
            // Pobierz cennik Cudzich (jeśli potrzebujemy walidacji ceny)
            let priceListSnapshot = {};
            try {
                const cudzichPriceList = await PriceList.findOne({ 
                    sellingPointName: 'Cudzich' 
                });
                
                if (cudzichPriceList) {
                    priceListSnapshot = {
                        sellingPointId: cudzichPriceList.sellingPointId,
                        sellingPointName: cudzichPriceList.sellingPointName,
                        priceAtTime: price
                    };
                }
            } catch (priceListError) {
                console.warn('⚠️ Nie udało się pobrać cennika Cudzich:', priceListError.message);
            }
            
            // Utwórz transakcję
            const transactionData = {
                type: type,
                price: price,
                userSymbol: userSymbol,
                sellingPointId: sellingPoint._id,
                recipientId: recipientId,
                notes: notes,
                createdBy: req.userData.userId, // Z middleware auth - poprawka
                priceListSnapshot: priceListSnapshot
            };
            
            // Dodaj dane produktu tylko dla odbior/zwrot
            if (['odbior', 'zwrot'].includes(type)) {
                transactionData.productId = productId;
                transactionData.productName = productName;
                transactionData.size = size;
            }
            
            const transaction = new CudzichTransaction(transactionData);
            
            await transaction.save();
            
            // Pobierz transakcję z populowanymi danymi
            const populatedTransaction = await CudzichTransaction.findById(transaction._id)
                .populate('productId', 'fullName category')
                .populate('sellingPointId', 'symbol location')
                .populate('createdBy', 'email symbol');
            
            // Oblicz nowe saldo
            const newBalance = await CudzichTransaction.calculateBalance(recipientId, userSymbol);
            
            res.status(201).json({
                transaction: populatedTransaction,
                newBalance: newBalance,
                message: `Transakcja ${type} została zapisana pomyślnie`
            });
            
        } catch (error) {
            console.error('❌ Błąd tworzenia transakcji Cudzich:', error);
            res.status(500).json({ error: error.message });
        }
    };
    
    // Usuń transakcję Cudzich
    deleteCudzichTransaction = async (req, res) => {
        try {
            const { transactionId } = req.params;
            const { userSymbol = 'P', recipientId = 'cudzich' } = req.query;
            
            const transaction = await CudzichTransaction.findById(transactionId);
            if (!transaction) {
                return res.status(404).json({
                    error: 'Nie znaleziono transakcji'
                });
            }
            
            // Sprawdź uprawnienia (czy transakcja należy do tego punktu sprzedaży)
            if (transaction.userSymbol !== userSymbol) {
                return res.status(403).json({
                    error: 'Brak uprawnień do usunięcia tej transakcji'
                });
            }
            
            await CudzichTransaction.findByIdAndDelete(transactionId);
            
            // Oblicz nowe saldo po usunięciu
            const newBalance = await CudzichTransaction.calculateBalance(recipientId, userSymbol);
            
            res.status(200).json({
                message: 'Transakcja została usunięta',
                deletedTransaction: transaction,
                newBalance: newBalance
            });
            
        } catch (error) {
            console.error('❌ Błąd usuwania transakcji Cudzich:', error);
            res.status(500).json({ error: error.message });
        }
    };
    
    // Pobierz cennik Cudzich z cenami
    getCudzichPriceList = async (req, res) => {
        try {
            console.log('🔍 Szukam cennika dla sellingPointName: "Cudzich"');
            
            // Najpierw sprawdź wszystkie cenniki
            const allPriceLists = await PriceList.find({}, 'sellingPointName sellingPointId');
            console.log('📋 Wszystkie cenniki:', allPriceLists.map(pl => ({ 
                name: pl.sellingPointName, 
                id: pl.sellingPointId 
            })));
            
            const cudzichPriceList = await PriceList.findOne({ 
                sellingPointName: 'Cudzich' 
            });
            
            if (!cudzichPriceList) {
                // Spróbuj różnych wariantów nazwy
                const alternatives = await PriceList.findOne({
                    $or: [
                        { sellingPointName: /cudzich/i },
                        { sellingPointId: /cudzich/i }
                    ]
                });
                
                if (alternatives) {
                    console.log('✅ Znaleziono alternatywny cennik:', alternatives.sellingPointName);
                    return res.status(200).json(alternatives);
                }
                
                return res.status(404).json({
                    error: 'Nie znaleziono cennika dla Cudzich',
                    availablePriceLists: allPriceLists.map(pl => pl.sellingPointName)
                });
            }
            
            console.log('✅ Znaleziono cennik Cudzich');
            res.status(200).json(cudzichPriceList);
            
        } catch (error) {
            console.error('❌ Błąd pobierania cennika Cudzich:', error);
            res.status(500).json({ error: error.message });
        }
    };
    
    // Pobierz statystyki miesięczne/roczne
    getCudzichStats = async (req, res) => {
        try {
            const { recipientId = 'cudzich', userSymbol = 'P', year, month } = req.query;
            
            let matchQuery = {
                recipientId: recipientId,
                userSymbol: userSymbol
            };
            
            // Filtrowanie po roku/miesiącu
            if (year) {
                const startDate = new Date(year, month ? month - 1 : 0, 1);
                const endDate = month 
                    ? new Date(year, month, 0, 23, 59, 59) 
                    : new Date(year, 11, 31, 23, 59, 59);
                
                matchQuery.date = { $gte: startDate, $lte: endDate };
            }
            
            const stats = await CudzichTransaction.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: {
                            type: '$type',
                            year: { $year: '$date' },
                            month: { $month: '$date' }
                        },
                        count: { $sum: 1 },
                        totalAmount: { $sum: '$price' },
                        products: { $push: '$productName' }
                    }
                },
                { $sort: { '_id.year': -1, '_id.month': -1 } }
            ]);
            
            res.status(200).json(stats);
            
        } catch (error) {
            console.error('❌ Błąd pobierania statystyk Cudzich:', error);
            res.status(500).json({ error: error.message });
        }
    };
}

module.exports = new CudzichTransactionController();