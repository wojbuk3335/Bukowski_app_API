const express = require('express');
const app = express();
const morgan = require('morgan');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const { port } = require('./config'); // Import port configuration
const { domain } = require('./config'); // Import domain configuration
app.use(express.json({ limit: '50mb' })); // Increase JSON payload limit
app.use(cors());

const mongoose = require('./db/mongoose');

app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: false, limit: '50mb' })); // Increase URL encoded limit
app.use(bodyParser.json({ limit: '50mb' })); // Increase JSON limit

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
const subcategoryCoatsRoutes = require('./routes/subcategoryCoats');
const bagsCategoryRoutes = require('./routes/bagsCategory');
const walletsCategoryRoutes = require('./routes/walletsCategory');
const remainingCategoryRoutes = require('./routes/remainingCategory');
const remainingSubcategoryRoutes = require('./routes/remainingSubcategory');
const manufacturerRoutes = require('./routes/manufacturer');
const printRoutes = require('./routes/print'); // Import print routes
const historyRoutes = require('./routes/history'); // Import history routes
const salesRoutes = require('./routes/sales'); // Import sales routes
const transferRoutes = require('./routes/transfer'); // Import transfer routes
const transactionHistoryRoutes = require('./routes/transactionHistory'); // Import transaction history routes
const localizationRoutes = require('./routes/locatization'); // Import localization routes
const bagsRoutes = require('./routes/bags'); // Import bags routes
const walletsRoutes = require('./routes/wallets'); // Import wallets routes
const remainingProductsRoutes = require('./routes/remainingProducts'); // Import remaining products routes
const deductionsRoutes = require('./routes/deductions'); // Import deductions routes
const transferProcessingRoutes = require('./routes/transferProcessing'); // Import transfer processing routes
const warehouseRoutes = require('./routes/warehouse'); // Import warehouse routes
const correctionsRoutes = require('./routes/corrections'); // Import corrections routes

app.use('/api/corrections', correctionsRoutes); // Use corrections routes
app.use('/api/sales', salesRoutes); // Use sales routes
app.use('/api/warehouse', warehouseRoutes); // Use warehouse routes
app.use('/api/transfer', transferProcessingRoutes); // Use transfer processing routes
app.use('/api/transfer', transferRoutes); // Use transfer routes
app.use('/api/deductions', deductionsRoutes); // Use deductions routes
app.use('/api/history', historyRoutes); // Use history routes
app.use('/api/transaction-history', transactionHistoryRoutes); // Use transaction history routes
app.use('/api/jackets', jacketRoutes);
app.use('/api/user', userRoutes);
app.use('/api/excel/stock', stockRoutes);
app.use('/api/excel/color', colorRoutes);
app.use('/api/excel/size', sizeRoutes);
app.use('/api/excel/goods', goodsRoutes);
app.use('/api/excel/category', categoryRoutes);
app.use('/api/excel/subcategoryCoats', subcategoryCoatsRoutes);
app.use('/api/excel/bags-category', bagsCategoryRoutes);
app.use('/api/excel/subcategoryBags', bagsCategoryRoutes); // Alias for bags subcategories
app.use('/api/excel/wallets-category', walletsCategoryRoutes);
app.use('/api/excel/remaining-category', remainingCategoryRoutes);
app.use('/api/excel/remaining-subcategory', remainingSubcategoryRoutes);
app.use('/api/excel/manufacturers', manufacturerRoutes);
app.use('/api/excel/localization', localizationRoutes); // Use localization routes
app.use('/api/excel/bags', bagsRoutes); // Use bags routes
app.use('/api/excel/wallets', walletsRoutes); // Use wallets routes
app.use('/api/excel/remaining-products', remainingProductsRoutes); // Use remaining products routes
app.use('/api/config', configRoutes);
app.use('/api/state', stateRoutes);
app.use('/api/category', categoryRoutes);
app.use('/api/subcategoryCoats', subcategoryCoatsRoutes);
app.use('/api', printRoutes); // Use print routes

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../public')));

// Error handling for unmatched API routes - ONLY for /api paths
app.use('/api/*', (req, res, next) => {
    const error = new Error('API endpoint not found');
    error.status = 404;
    next(error);
});

// Catch-all route to serve React's index.html for NON-API routes only
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
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
