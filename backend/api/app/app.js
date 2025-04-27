const express = require('express');
const app = express();
const morgan = require('morgan');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const { port } = require('./config'); // Import port configuration
const { domain } = require('./config'); // Import domain configuration
app.use(express.json()); // Add this line
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
const sizeRoutes = require('./routes/sizes');
const goodsRoutes = require('./routes/goods');
const configRoutes = require('./routes/config');
const stateRoutes = require('./routes/state');
const categoryRoutes = require('./routes/category');
const printRoutes = require('./routes/print'); // Import print routes
const historyRoutes = require('./routes/history'); // Import history routes
const salesRoutes = require('./routes/sales'); // Import sales routes


app.use('/api/sales', salesRoutes); // Use sales routes
app.use('/api/history', historyRoutes); // Use history routes
app.use('/api/jackets', jacketRoutes);
app.use('/api/user', userRoutes);
app.use('/api/excel/stock', stockRoutes);
app.use('/api/excel/color', colorRoutes);
app.use('/api/excel/size', sizeRoutes);
app.use('/api/excel/goods', goodsRoutes);
app.use('/api/excel/category', categoryRoutes);
app.use('/api/config', configRoutes);
app.use('/api/state', stateRoutes);
app.use('/api/category', categoryRoutes);
app.use('/api', printRoutes); // Use print routes

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../public')));

// Catch-all route to serve React's index.html for unmatched routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Error handling for unmatched API routes
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

// Start the server
app.listen(port, () => {
    console.log(`Server uruchomiony na ${domain}`);
});

module.exports = app;