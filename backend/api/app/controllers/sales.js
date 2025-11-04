const Sales = require('../db/models/sales');
const mongoose = require('mongoose');

class SalesController {

    static async saveSales(req, res) {
        try {
            const { fullName, timestamp, barcode, size, sellingPoint, from, cash, card, symbol, source, notes } = req.body;

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
                date: new Date(), // Current date
                source: source || null, // Add source field for Cudzich transactions
                notes: notes || null // Add notes field for additional information
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
            // Pokaż wszystkie sprzedaże (przetworzone i nieprzetworzone)
            // Domyślnie ukryj zwrócone sprzedaże, chyba że specjalnie poproszono
            const includeReturned = req.query.includeReturned === 'true';
            
            const filter = includeReturned ? {} : { returned: { $ne: true } };
            const sales = await Sales.find(filter);
            
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
            console.log(`🔄 Updating sale ${req.params.salesId} with data:`, req.body);
            const updatedSales = await Sales.findByIdAndUpdate(req.params.salesId, req.body, { new: true });
            if (!updatedSales) {
                console.log(`❌ Sale not found: ${req.params.salesId}`);
                return res.status(404).json({ message: 'Sales not found' });
            }
            console.log(`✅ Sale updated successfully:`, updatedSales);
            res.status(200).json(updatedSales);
        } catch (error) {
            console.error(`❌ Error updating sale ${req.params.salesId}:`, error.message);
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
            console.log('Searching for sellingPoint:', sellingPoint);

            // Find sales for the specific date and selling point
            // Domyślnie ukryj zwrócone sprzedaże
            const includeReturned = req.query.includeReturned === 'true';
            
            const filter = {
                sellingPoint: sellingPoint,
                timestamp: {
                    $gte: startDate,
                    $lte: endDate
                }
            };
            
            if (!includeReturned) {
                filter.returned = { $ne: true };
            }
            
            const sales = await Sales.find(filter).sort({ timestamp: -1 }); // Sort by timestamp descending
            
            console.log('Found sales:', sales.length);
            console.log('Sales data:', sales);

            res.status(200).json(sales);
        } catch (error) {
            console.error('Error filtering sales by date and selling point:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    static async markAsReturned(req, res) {
        try {
            const { fullName, size, source, returnReason, returnDate } = req.body;
            
            if (!fullName || !size || !source) {
                return res.status(400).json({ 
                    error: 'fullName, size, and source parameters are required' 
                });
            }

            // Find and update all matching sales from Cudzich that are not already returned
            const updateResult = await Sales.updateMany(
                {
                    fullName: fullName,
                    size: size,
                    source: source,
                    returned: { $ne: true } // Only update sales that are not already marked as returned
                },
                {
                    $set: {
                        returned: true,
                        returnReason: returnReason || 'Zwrot przez Cudzich',
                        returnDate: returnDate || new Date().toISOString()
                    }
                }
            );

            res.status(200).json({
                message: 'Sales marked as returned successfully',
                matchedCount: updateResult.matchedCount,
                modifiedCount: updateResult.modifiedCount
            });
        } catch (error) {
            console.error('Error marking sales as returned:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    static async createHistoricalSale(req, res) {
        try {
            const { fullName, size, price, sellingPoint, symbol, source, notes, historicalDate } = req.body;
            
            if (!fullName || !size || !price || !sellingPoint || !symbol) {
                return res.status(400).json({ 
                    error: 'fullName, size, price, sellingPoint, and symbol parameters are required' 
                });
            }

            // Parse historical date or use 30 days ago as default
            const saleDate = historicalDate ? new Date(historicalDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            
            const historicalSale = new Sales({
                _id: new mongoose.Types.ObjectId(),
                fullName,
                timestamp: saleDate,
                barcode: 'HISTORICAL-' + Date.now(), // Generate unique barcode for historical sales
                size,
                sellingPoint,
                from: symbol,
                cash: [{ price: parseFloat(price), currency: 'PLN' }],
                card: [],
                symbol,
                date: new Date(), // Current date for record creation
                source: source || 'Cudzich',
                notes: notes || 'Sprzedaż historyczna - dodana wstecznie'
            });

            await historicalSale.save();

            res.status(201).json({
                message: 'Historical sale created successfully',
                sale: historicalSale
            });
        } catch (error) {
            console.error('Error creating historical sale:', error.message);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = SalesController;
