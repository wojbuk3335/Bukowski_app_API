const express = require('express');
const app = express();
const morgan = require('morgan');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');

app.use(cors());

const mongoose = require('./db/mongoose');

app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// One folder up from current file is public folder with images and make the folder public
app.use('/', express.static(path.join(__dirname, '../public')));

// Routes which should handle requests
const jacketRoutes = require('./routes/jackets');
const userRoutes = require('./routes/user');
const stockRoutes = require('./routes/stock');
const colorRoutes = require('./routes/colors');
const sizeRoutes = require('./routes/sizes');
const goodsRoutes = require('./routes/goods');
const categoryRoutes = require('./routes/category'); // Ensure this line is correct

app.use('/api/jackets', jacketRoutes);
app.use('/api/user', userRoutes);
app.use('/api/excel/stock', stockRoutes);
app.use('/api/excel/color', colorRoutes);
app.use('/api/excel/size', sizeRoutes);
app.use('/api/excel/goods', goodsRoutes);
app.use('/api/excel/category', categoryRoutes); // Ensure this line is correct

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