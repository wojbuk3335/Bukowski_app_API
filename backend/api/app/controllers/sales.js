const Sales = require('../db/models/sales');
const mongoose = require('mongoose');

class SalesController {

    static async saveSales(req, res) {
        try {
            console.log("WOTJEK ")
            const salesData = req.body;

            // Validate and convert required fields to ObjectId
            if (!mongoose.Types.ObjectId.isValid(salesData.sizeId)) {
                return res.status(400).json({ error: 'Invalid sizeId ObjectId' });
            }

            const sizeId = new mongoose.Types.ObjectId(salesData.sizeId);
            const date = salesData.date ? new Date(salesData.date) : new Date(); // Ensure date is provided or use the current date

            // Create a new Sales document
            const newSales = new Sales({
                _id: new mongoose.Types.ObjectId(),
                fullName: salesData.fullName, // Ensure fullName is a String
                timestamp: new Date(salesData.timestamp), // Convert to Date
                barcode: salesData.barcode, // String
                sizeId: sizeId, // ObjectId
                sellingPoint: salesData.sellingPoint, // Ensure sellingPoint is a String
                from: salesData.from, // String
                cash: salesData.cash.map(c => ({
                    price: parseFloat(c.price), // Convert price to Number
                    currency: c.currency // String
                })),
                card: salesData.card.map(c => ({
                    price: parseFloat(c.price), // Convert price to Number
                    currency: c.currency // String
                })),
                date: date, // Ensure date is set
                size: salesData.size // Ensure size is included
            });

            // Save to the database
            const savedSales = await newSales.save();

            // Log success message
            console.log('Sales record saved successfully:', savedSales);

            res.status(201).json(savedSales);
        } catch (error) {
            console.log('Error saving sales record:', error.message); // Log error message
            res.status(500).json({ message: 'Error saving sales', error: error.message });
        }
    }

    static async getAllSales(req, res) {
        try {
            const sales = await Sales.find({})
                .populate('sizeId'); // Populate sizeId to fetch related Size document
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
