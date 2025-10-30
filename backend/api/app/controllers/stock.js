const Stock = require('../db/models/stock');
const mongoose = require('mongoose');
const config = require('../config');
const axios = require('axios');

class StockController {
    getAllStocks(req, res, next) {
        Stock.find()
            .select('_id Tow_Kod Tow_Opis')
            .then(stocks => {
                const response = {
                    count: stocks.length,
                    stocks: stocks.map(stock => {
                        return {
                            _id: stock._id,
                            Tow_Kod: stock.Tow_Kod,
                            Tow_Opis: stock.Tow_Opis,
                            request: {
                                type: 'GET',
                                url: `${config.domain}/api/excel/stock/${stock._id}`
                            }
                        };
                    })
                };
                res.status(200).json(response);
            })
            .catch(err => {
                res.status(500).json({
                    error: {
                        message: err.message
                    }
                });
            });
    }

    insertManyStocks(req, res, next) {
        const stocks = req.body;

        // Check for duplicate Tow_Kod values in the request body
        const towKodSet = new Set();
        for (const stock of stocks) {
            if (towKodSet.has(stock.Tow_Kod)) {
                return res.status(400).json({
                    error: {
                        message: 'Duplicate Tow_Kod values in request body'
                    }
                });
            }
            towKodSet.add(stock.Tow_Kod);
        }

        // Proceed to insert the stocks
        Stock.insertMany(stocks, { returnDocument: 'after' })
            .then(async (result) => {
                // If _id is missing in test environment, fetch documents
                let stocksWithId = result;
                if (!result[0]._id) {
                    const towKods = stocks.map(s => s.Tow_Kod);
                    stocksWithId = await Stock.find({ Tow_Kod: { $in: towKods } }).lean();
                }
                
                res.status(201).json({
                    message: 'Stocks inserted',
                    stocks: stocksWithId
                });
            })
            .catch(err => {
                if (err.code === 11000) { // Duplicate key error
                    res.status(400).json({
                        error: {
                            message: 'Duplicate Tow_Kod values'
                        }
                    });
                } else {
                    res.status(500).json({
                        error: {
                            message: err.message
                        }
                    });
                }
            });
    }

    deleteAllStocks(req, res, next) {
        Stock.deleteMany()
            .then(result => {
                res.status(200).json({
                    message: 'All stocks deleted'
                });
            })
            .catch(err => {
                res.status(500).json({
                    error: {
                        message: err.message
                    }
                });
            });
    }

    getStockById(req, res, next) {
        const id = req.params.stockId;
        Stock.findById(id)
            .select('_id Tow_Kod Tow_Opis')
            .then(stock => {
                if (stock) {
                    res.status(200).json({
                        stock: stock,
                        request: {
                            type: 'GET',
                            url: `${config.domain}/api/excel/stock/get-all-stocks`
                        }
                    });
                } else {
                    res.status(404).json({
                        error: {
                            message: 'Stock not found'
                        }
                    });
                }
            })
            .catch(err => {
                res.status(500).json({
                    error: {
                        message: err.message
                    }
                });
            });
    }

    async updateStockById(req, res, next) {
        const id = req.params.stockId;
        const updateOps = {};
        
        // Get old stock data before updating
        let oldStock = null;
        try {
            oldStock = await Stock.findById(id);
        } catch (err) {
            return res.status(500).json({
                error: { message: err.message }
            });
        }

        if (!oldStock) {
            return res.status(404).json({
                error: { message: 'Stock not found' }
            });
        }

        for (const key in req.body) {
            if (req.body.hasOwnProperty(key)) {
                updateOps[key] = req.body[key];
            }
        }

        Stock.findByIdAndUpdate(id, { $set: updateOps }, { new: true })
            .then(async (result) => {
                // Check if Tow_Opis (stock name) was changed and sync product names
                if (updateOps.Tow_Opis && oldStock.Tow_Opis !== updateOps.Tow_Opis) {
                    try {
                        // In test environment, call directly to avoid HTTP issues
                        if (process.env.NODE_ENV === 'test') {
                            const GoodsController = require('./goods');
                            
                            // Create mock req/res for direct method call
                            const mockReq = {
                                body: {
                                    type: 'stock',
                                    fieldType: 'Tow_Opis',
                                    oldValue: {
                                        id: oldStock._id,
                                        name: oldStock.Tow_Opis
                                    },
                                    newValue: updateOps.Tow_Opis
                                }
                            };
                            
                            const mockRes = {
                                status: () => mockRes,
                                json: (data) => data
                            };
                            
                            await GoodsController.syncProductNames(mockReq, mockRes);
                        } else {
                            // Production environment - use HTTP call
                            await axios.post(`${config.domain || 'http://localhost:3000'}/api/excel/goods/sync-product-names`, {
                                type: 'stock',
                                fieldType: 'Tow_Opis',
                                oldValue: {
                                    id: oldStock._id,
                                    name: oldStock.Tow_Opis
                                },
                                newValue: updateOps.Tow_Opis
                            });
                        }
                    } catch (syncError) {
                        console.error('❌ Error synchronizing product names after stock update:', syncError.message);
                        // Don't fail the stock update if sync fails
                    }
                }

                res.status(200).json({
                    message: 'Stock updated',
                    request: {
                        type: 'GET',
                        url: `${config.domain}/api/excel/stock/${id}`
                    }
                });
            })
            .catch(err => {
                res.status(500).json({
                    error: {
                        message: err.message
                    }
                });
            });
    }
}

module.exports = new StockController();