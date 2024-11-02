const Stock = require('../db/models/stock');
const mongoose = require('mongoose');

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
                                url: 'http://localhost:3000/api/excel/stock/' + stock._id
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
        Stock.insertMany(stocks)
            .then(result => {
                res.status(201).json({
                    message: 'Stocks inserted',
                    stocks: result
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

    //deleteAllStocks
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

    //getStockById
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
                            url: 'http://localhost:3000/api/excel/stock/get-all-stocks'
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

    //updateStockById
    updateStockById(req, res, next) {
        const id = req.params.stockId;
        const updateOps = {};
        for (const key in req.body) {
            if (req.body.hasOwnProperty(key)) {
                updateOps[key] = req.body[key];
            }
        }
        Stock.findByIdAndUpdate(id, { $set: updateOps }, { new: true })
            .then(result => {
                res.status(200).json({
                    message: 'Stock updated',
                    request: {
                        type: 'GET',
                        url: 'http://localhost:3000/api/excel/stock/' + id
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