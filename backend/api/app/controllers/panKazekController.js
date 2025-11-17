const PanKazek = require('../db/models/panKazek');
const mongoose = require('mongoose');

// Add product to Pan Kazek list
const addProduct = async (req, res) => {
    try {
        const {
            productId,
            fullName,
            size,
            price,
            barcode,
            date,
            dateString,
            addedBy,
            symbol
        } = req.body;

        // Validate required fields
        if (!productId || !fullName || !size || !addedBy) {
            return res.status(400).json({
                message: 'Brak wymaganych danych: productId, fullName, size, addedBy'
            });
        }

        // Check if product already exists in Pan Kazek list
        const existingProduct = await PanKazek.findOne({ productId: productId });
        if (existingProduct) {
            return res.status(400).json({
                message: 'Ten produkt został już dodany do listy Pana Kazka'
            });
        }

        // Create new Pan Kazek entry
        const panKazekEntry = new PanKazek({
            productId,
            fullName,
            size,
            price: price || '0',
            barcode: barcode || '',
            date: date || new Date().toISOString(),
            dateString: dateString || new Date().toISOString().split('T')[0],
            addedBy,
            symbol: symbol || addedBy
        });

        const savedEntry = await panKazekEntry.save();

        // Pan Kazek tracks sales (not state), so no need to update state collection

        res.status(201).json({
            message: 'Produkt został pomyślnie dodany do listy Pana Kazka',
            data: savedEntry
        });

    } catch (error) {
        console.error('Error adding product to Pan Kazek:', error);
        res.status(500).json({
            message: 'Błąd serwera podczas dodawania produktu',
            error: error.message
        });
    }
};

// Get all Pan Kazek products
const getAllProducts = async (req, res) => {
    try {
        const { status, month, year } = req.query;
        
        let filter = {};
        
        // Filter by status
        if (status && ['pending', 'paid'].includes(status)) {
            filter.status = status;
        }
        
        // Filter by month and year
        if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59);
            filter.createdAt = {
                $gte: startDate,
                $lte: endDate
            };
        } else if (year) {
            const startDate = new Date(year, 0, 1);
            const endDate = new Date(year, 11, 31, 23, 59, 59);
            filter.createdAt = {
                $gte: startDate,
                $lte: endDate
            };
        }
        
        const products = await PanKazek.find(filter).sort({ createdAt: -1 });
        
        // Get overall statistics
        const allTimeStats = {
            total: await PanKazek.countDocuments(),
            pending: await PanKazek.countDocuments({ status: 'pending' }),
            paid: await PanKazek.countDocuments({ status: 'paid' })
        };
        
        // Get filtered statistics
        const filteredStats = {
            total: await PanKazek.countDocuments(filter),
            pending: await PanKazek.countDocuments({ ...filter, status: 'pending' }),
            paid: await PanKazek.countDocuments({ ...filter, status: 'paid' })
        };
        
        res.status(200).json({
            message: 'Lista produktów Pana Kazka pobrana pomyślnie',
            count: products.length,
            allTimeStats: allTimeStats,
            filteredStats: filteredStats,
            filters: { status, month, year },
            data: products
        });

    } catch (error) {
        console.error('Error fetching Pan Kazek products:', error);
        res.status(500).json({
            message: 'Błąd serwera podczas pobierania produktów',
            error: error.message
        });
    }
};

// Remove product from Pan Kazek list
const removeProduct = async (req, res) => {
    try {
        const productId = req.params.id;

        const deletedProduct = await PanKazek.findOneAndDelete({ productId: productId });
        
        if (!deletedProduct) {
            return res.status(404).json({
                message: 'Nie znaleziono produktu w liście Pana Kazka'
            });
        }

        // Pan Kazek tracks sales (not state), so no need to update state collection

        res.status(200).json({
            message: 'Produkt został usunięty z listy Pana Kazka',
            data: deletedProduct
        });

    } catch (error) {
        console.error('Error removing product from Pan Kazek:', error);
        res.status(500).json({
            message: 'Błąd serwera podczas usuwania produktu',
            error: error.message
        });
    }
};

// Pay all pending products
const payAllProducts = async (req, res) => {
    try {
        const { paidBy, paidAmount } = req.body;
        
        if (!paidBy) {
            return res.status(400).json({
                message: 'Brak informacji o osobie rozliczającej (paidBy)'
            });
        }

        if (!paidAmount || paidAmount <= 0) {
            return res.status(400).json({
                message: 'Kwota rozliczenia musi być większa od 0'
            });
        }

        // Count pending products before update
        const pendingCount = await PanKazek.countDocuments({ status: 'pending' });
        
        if (pendingCount === 0) {
            return res.status(404).json({
                message: 'Brak kurtek do rozliczenia'
            });
        }

        // Update all pending products to paid
        const result = await PanKazek.updateMany(
            { status: 'pending' },
            { 
                status: 'paid',
                paidAt: new Date(),
                paidBy: paidBy,
                paidAmount: paidAmount,
                totalItemsCount: pendingCount
            }
        );

        res.status(200).json({
            message: `Rozliczono ${result.modifiedCount} kurtek za kwotę ${paidAmount} PLN`,
            paidCount: result.modifiedCount,
            paidAmount: paidAmount,
            paidBy: paidBy,
            paidAt: new Date(),
            averagePerItem: Math.round((paidAmount / pendingCount) * 100) / 100
        });

    } catch (error) {
        console.error('Error paying all products:', error);
        res.status(500).json({
            message: 'Błąd serwera podczas rozliczania kurtek',
            error: error.message
        });
    }
};

// Get available months for filtering
const getAvailableMonths = async (req, res) => {
    try {
        const result = await PanKazek.aggregate([
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" }
                    },
                    count: { $sum: 1 },
                    pending: {
                        $sum: {
                            $cond: [{ $eq: ["$status", "pending"] }, 1, 0]
                        }
                    },
                    paid: {
                        $sum: {
                            $cond: [{ $eq: ["$status", "paid"] }, 1, 0]
                        }
                    }
                }
            },
            {
                $sort: { "_id.year": -1, "_id.month": -1 }
            }
        ]);

        const months = result.map(item => ({
            year: item._id.year,
            month: item._id.month,
            monthName: new Date(item._id.year, item._id.month - 1).toLocaleString('pl-PL', { month: 'long' }),
            count: item.count,
            pending: item.pending,
            paid: item.paid
        }));

        res.status(200).json({
            message: 'Dostępne miesiące pobrane pomyślnie',
            data: months
        });

    } catch (error) {
        console.error('Error fetching available months:', error);
        res.status(500).json({
            message: 'Błąd serwera podczas pobierania miesięcy',
            error: error.message
        });
    }
};

module.exports = {
    addProduct,
    getAllProducts,
    removeProduct,
    payAllProducts,
    getAvailableMonths
};