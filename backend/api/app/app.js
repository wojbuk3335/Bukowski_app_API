const express = require('express');
const app = express();
const morgan = require('morgan');
const bodyParser = require('body-parser');
const {database}= require('./config');


const mongoose = require('./db/mongoose');


app.use(morgan('dev'));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

// Routes which should handle requests
const jacketRoutes = require('./routes/jackets');
const userRoutes = require('./routes/user');

app.use('/api/jackets', jacketRoutes);
app.use('/api/user', userRoutes);

app.use((req, res, next) => {
    const error = new Error('Not Found');
    error.status = 404;
    next(error);
})

app.use((error, req, res, next) => {
    res.status(error.status || 500);
    res.json({
        error: {
            message: error.message
        }
    })
})

module.exports = app;


