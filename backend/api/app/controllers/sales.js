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
            // WAŻNE: Pokazuj tylko nieprzetworzone sales (podobnie jak transfery)
            const sales = await Sales.find({ 
                $or: [
                    { processed: { $ne: true } }, // Nieprzetworzone
                    { processed: { $exists: false } } // Bez pola processed (stare dane)
                ]
            });
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
            console.log('Searching for sellingPoint:', sellingPoint);

            // Find sales for the specific date and selling point
            const sales = await Sales.find({
                sellingPoint: sellingPoint,
                timestamp: {
                    $gte: startDate,
                    $lte: endDate
                }
            }).sort({ timestamp: -1 }); // Sort by timestamp descending
            
            console.log('Found sales:', sales.length);
            console.log('Sales data:', sales);

            res.status(200).json(sales);
        } catch (error) {
            console.error('Error filtering sales by date and selling point:', error.message);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = SalesController;
