const Sales = require('../db/models/sales');
const mongoose = require('mongoose');

class SalesController {

    static async saveSales(req, res) {
        try {
            const { fullName, timestamp, barcode, size, sellingPoint, from, cash, card, symbol } = req.body;

            // Parse the timestamp from the provided format
            const parsedTimestamp = new Date(
                timestamp.replace(/(\d{2})\.(\d{2})\.(\d{4}), (\d{2}):(\d{2}):(\d{2})/, '$3-$2-$1T$4:$5:$6')
            );

            const sales = new Sales({
                _id: new mongoose.Types.ObjectId(),
                fullName,
                timestamp: parsedTimestamp,
                barcode,
                size,
                sellingPoint,
                from,
                cash,
                card,
                symbol, // Add symbol field
                date: new Date() // Current date
            });

            await sales.save();
            res.status(201).json({ message: 'Sales saved successfully', sales });
        } catch (error) {
            console.error('Error saving sales:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    static async getAllSales(req, res) {
        try {
            const sales = await Sales.find({});
            res.status(200).json(sales);
        } catch (error) {
            console.log('Error fetching all sales:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    static async insertManySales(req, res) {
            try {
                const sales = await Sales.insertMany(req.body);
                res.status(201).json(sales);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
    }

    static async deleteAllSales(req, res) {
        try {
            await Sales.deleteMany();
            res.status(200).json({ message: 'All sales deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getSalesById(req, res) {
        try {
            const sales = await Sales.findById(req.params.salesId).populate('size'); // Removed 'fullName' and 'sellingPoint'
            if (!sales) {
                return res.status(404).json({ message: 'Sales not found' });
            }
            res.status(200).json(sales);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async updateSalesById(req, res) {
        try {
            const updatedSales = await Sales.findByIdAndUpdate(req.params.salesId, req.body, { new: true });
            if (!updatedSales) {
                return res.status(404).json({ message: 'Sales not found' });
            }
            res.status(200).json(updatedSales);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async deleteSalesById(req, res) {
        try {
            const deletedSale = await Sales.findByIdAndDelete(req.params.salesId);
            if (!deletedSale) {
                return res.status(404).json({ message: 'Sale not found' });
            }
            res.status(200).json({ message: 'Sale deleted successfully', deletedSale });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getSalesByDateAndSellingPoint(req, res) {
        try {
            const { date, sellingPoint } = req.query;
            
            console.log('Received query params:', { date, sellingPoint });
            
            if (!date || !sellingPoint) {
                return res.status(400).json({ 
                    error: 'Date and sellingPoint parameters are required' 
                });
            }

            // Parse the date to get start and end of the day
            const startDate = new Date(date);
            startDate.setUTCHours(0, 0, 0, 0);
            
            const endDate = new Date(date);
            endDate.setUTCHours(23, 59, 59, 999);
            
            console.log('Date range:', { startDate, endDate });
            console.log('Searching for sellingPoint:', sellingPoint);            // Find sales for the specific date and selling point
            const sales = await Sales.find({
                sellingPoint: sellingPoint,
                date: {
                    $gte: startDate,
                    $lte: endDate
                }
            }).sort({ date: -1 }); // Sort by date descending
            
            console.log('Found sales:', sales.length);
            console.log('Sales data:', sales);

            res.status(200).json(sales);
        } catch (error) {
            console.error('Error filtering sales by date and selling point:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    // Nowa metoda - Dynamiczna analiza sprzedaży
    static async getDynamicSalesAnalysis(req, res) {
        try {
            const { startDate, endDate, sellingPoints } = req.body;
            
            console.log('Dynamic analysis request:', { startDate, endDate, sellingPoints });
            
            if (!startDate || !endDate || !sellingPoints || !Array.isArray(sellingPoints)) {
                return res.status(400).json({ 
                    error: 'startDate, endDate and sellingPoints (array) are required' 
                });
            }

            // Parse dates
            const parsedStartDate = new Date(startDate);
            parsedStartDate.setUTCHours(0, 0, 0, 0);
            
            const parsedEndDate = new Date(endDate);
            parsedEndDate.setUTCHours(23, 59, 59, 999);
            
            console.log('Date range:', { parsedStartDate, parsedEndDate });
            console.log('Selected selling points:', sellingPoints);            // Find sales for the date range and selected selling points
            const sales = await Sales.find({
                sellingPoint: { $in: sellingPoints },
                date: {
                    $gte: parsedStartDate,
                    $lte: parsedEndDate
                }
            });
            
            console.log('Found sales for analysis:', sales.length);            // Calculate analytics
            const analytics = {
                totalQuantity: sales.length, // Całkowita ilość sprzedanych produktów (kurtek)
                totalValue: {}, // Całkowita wartość według walut
                salesBySellingPoint: {}, // Sprzedaż według punktów
                productBreakdown: {}, // Rozkład produktów
                sellingPointBreakdown: {} // Rozkład według punktów sprzedaży
            };

            // Initialize selling point breakdown
            sellingPoints.forEach(point => {
                analytics.sellingPointBreakdown[point] = {
                    count: 0,
                    value: {}
                };
            });

            // Process each sale
            sales.forEach(sale => {
                // Count products by selling point
                if (analytics.sellingPointBreakdown[sale.sellingPoint]) {
                    analytics.sellingPointBreakdown[sale.sellingPoint].count++;
                }

                // Calculate total value by currency
                [...sale.card, ...sale.cash].forEach(payment => {
                    // Global total
                    if (!analytics.totalValue[payment.currency]) {
                        analytics.totalValue[payment.currency] = 0;
                    }
                    analytics.totalValue[payment.currency] += payment.price;

                    // By selling point
                    if (analytics.sellingPointBreakdown[sale.sellingPoint]) {
                        if (!analytics.sellingPointBreakdown[sale.sellingPoint].value[payment.currency]) {
                            analytics.sellingPointBreakdown[sale.sellingPoint].value[payment.currency] = 0;
                        }
                        analytics.sellingPointBreakdown[sale.sellingPoint].value[payment.currency] += payment.price;
                    }
                });

                // Product breakdown
                if (!analytics.productBreakdown[sale.fullName]) {
                    analytics.productBreakdown[sale.fullName] = {
                        count: 0,
                        value: {}
                    };
                }
                analytics.productBreakdown[sale.fullName].count++;

                [...sale.card, ...sale.cash].forEach(payment => {
                    if (!analytics.productBreakdown[sale.fullName].value[payment.currency]) {
                        analytics.productBreakdown[sale.fullName].value[payment.currency] = 0;
                    }
                    analytics.productBreakdown[sale.fullName].value[payment.currency] += payment.price;
                });
            });            const result = {
                dateRange: {
                    start: startDate,
                    end: endDate
                },
                selectedSellingPoints: sellingPoints,
                totalQuantity: analytics.totalQuantity,
                totalValue: analytics.totalValue,
                analytics: analytics,
                rawSales: sales // Optional: include raw data if needed
            };

            res.status(200).json(result);
        } catch (error) {
            console.error('Error in dynamic sales analysis:', error.message);
            res.status(500).json({ error: error.message });
        }
    }    // Metoda do pobierania dostępnych punktów sprzedaży
    static async getAvailableSellingPoints(req, res) {
        try {
            const sellingPoints = await Sales.distinct('sellingPoint');
            
            res.status(200).json(sellingPoints.filter(point => point && point.trim() !== ''));
        } catch (error) {
            console.error('Error fetching selling points:', error.message);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = SalesController;
