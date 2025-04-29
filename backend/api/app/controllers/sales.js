const Sales = require('../db/models/sales');
const mongoose = require('mongoose');

class SalesController {

    static async saveSales(req, res) {
        try {
            const { fullName, timestamp, barcode, sizeId, sellingPoint, from, cash, card } = req.body;

            // Parse the timestamp from the provided format
            const parsedTimestamp = new Date(
                timestamp.replace(/(\d{2})\.(\d{2})\.(\d{4}), (\d{2}):(\d{2}):(\d{2})/, '$3-$2-$1T$4:$5:$6')
            );

            const sales = new Sales({
                _id: new mongoose.Types.ObjectId(),
                fullName,
                timestamp: parsedTimestamp,
                barcode,
                sizeId, // Correctly use sizeId
                sellingPoint,
                from,
                cash,
                card,
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
            const sales = await Sales.find({}); // Removed .populate('sizeId')
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
}

module.exports = SalesController;
