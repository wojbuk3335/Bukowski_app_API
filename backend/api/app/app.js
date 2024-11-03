const express = require('express');
const app = express();
const morgan = require('morgan');
const bodyParser = require('body-parser');
const { database } = require('./config');
const cors = require('cors');

app.use(cors());

const mongoose = require('./db/mongoose');

app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Routes which should handle requests
const jacketRoutes = require('./routes/jackets');
const userRoutes = require('./routes/user');
const stockRoutes = require('./routes/stock');
const colorRoutes = require('./routes/colors');
const sizeRoutes = require('./routes/sizes'); // Add this line

app.use('/api/jackets', jacketRoutes);
app.use('/api/user', userRoutes);
app.use('/api/excel/stock', stockRoutes);
app.use('/api/excel/color', colorRoutes);
app.use('/api/excel/size', sizeRoutes); // Add this line

app.use((req, res, next) => {
    const error = new Error('Not Found');
    error.status = 404;
    next(error);
});

app.use((error, req, res, next) => {
    res.status(error.status || 500);
    res.json({
        error: {
            message: error.message
        }
    });
});

module.exports = app;