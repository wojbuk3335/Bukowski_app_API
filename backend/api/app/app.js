const express = require('express');
const app = express();
const helmet = require('helmet'); // 🔒 Zabezpieczenia HTTP headers
const rateLimit = require('express-rate-limit'); // 🔒 Rate limiting
const mongoSanitize = require('express-mongo-sanitize'); // 🔒 Ochrona przed NoSQL injection
const morgan = require('morgan');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const { port } = require('./config'); // Import port configuration
const { domain } = require('./config'); // Import domain configuration
// 🔒 ZABEZPIECZENIA HTTP HEADERS
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false, // Dla compatibility z zewnętrznymi bibliotekami
}));

app.use(express.json({ limit: '50mb' })); // Increase JSON payload limit

// 🔒 BEZPIECZNA KONFIGURACJA CORS - zamiast app.use(cors())
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://twoja-domena.com'] // 🔒 Tylko twoja domena na produkcji
        : ['http://localhost:3000', 'http://localhost:3001'], // Development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 🔒 RATE LIMITING - Ochrona przed atakami
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minut
    max: 1000, // zwiększone z 100 do 1000 requestów na IP na 15 minut
    message: {
        error: 'Zbyt wiele requestów z tego IP, spróbuj ponownie za 15 minut.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

const loginLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minut (krótszy czas)
    max: 50, // zwiększone z 10 do 50 prób logowania na IP na 5 minut
    message: {
        error: 'Zbyt wiele prób logowania, spróbuj ponownie za 5 minut.'
    },
    skipSuccessfulRequests: true,
});

app.use(limiter); // Globalny limit
app.use('/api/user/login', loginLimiter); // Specjalny limit dla logowania

// 🔒 OCHRONA PRZED NoSQL INJECTION
app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`⚠️ NoSQL injection attempt detected: ${key} in ${req.url}`);
  }
}));

// Log wszystkich requestów - DISABLED
// app.use((req, res, next) => {
//     console.log(`📨 ${req.method} ${req.url} from ${req.get('host')} - Origin: ${req.get('origin')}`);
//     next();
// });

// Set UTF-8 headers only for API routes
app.use('/api', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
});

const mongoose = require('./db/mongoose');

// app.use(morgan('dev')); // HTTP request logging - DISABLED
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
const beltsRoutes = require('./routes/belts');
const glovesRoutes = require('./routes/gloves');
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
const priceListRoutes = require('./routes/priceList'); // Import price list routes
const debugUsersRoutes = require('./routes/debug-users'); // 🔧 TYMCZASOWY DEBUG
const emergencyResetRoutes = require('./routes/emergency-reset'); // 🚨 EMERGENCY RESET

app.use('/api/emergency', emergencyResetRoutes); // 🚨 EMERGENCY - USUŃ NATYCHMIAST PO UŻYCIU!
app.use('/api/debug', debugUsersRoutes); // 🔧 TYMCZASOWY ENDPOINT - USUŃ PO DEBUGOWANIU!
app.use('/api/corrections', correctionsRoutes); // Use corrections routes
app.use('/api/pricelists', priceListRoutes); // Use price list routes
app.use('/api/excel/priceList', priceListRoutes); // Use price list routes for excel namespace
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
app.use('/api/goods', goodsRoutes); // Add direct API access for print selections
app.use('/api/excel/category', categoryRoutes);
app.use('/api/excel/subcategoryCoats', subcategoryCoatsRoutes);
app.use('/api/excel/bags-category', bagsCategoryRoutes);
app.use('/api/excel/subcategoryBags', bagsCategoryRoutes); // Alias for bags subcategories
app.use('/api/excel/wallets-category', walletsCategoryRoutes);
app.use('/api/excel/remaining-category', remainingCategoryRoutes);
app.use('/api/excel/remaining-subcategory', remainingSubcategoryRoutes);
app.use('/api/excel/manufacturers', manufacturerRoutes);
app.use('/api/manufacturers', manufacturerRoutes); // Add direct API access
app.use('/api/sizes', sizeRoutes); // Add direct API access
app.use('/api/excel/belts', beltsRoutes);
app.use('/api/excel/gloves', glovesRoutes);
app.use('/api/excel/localization', localizationRoutes); // Use localization routes
app.use('/api/excel/bags', bagsRoutes); // Use bags routes
app.use('/api/excel/wallets', walletsRoutes); // Use wallets routes
app.use('/api/excel/remaining-products', remainingProductsRoutes); // Use remaining products routes
app.use('/api/config', configRoutes);
app.use('/api/state', stateRoutes);
app.use('/api/category', categoryRoutes);
app.use('/api/subcategoryCoats', subcategoryCoatsRoutes);
app.use('/api/print', printRoutes); // Use print routes

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

// Start the server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
    app.listen(port, () => {
        console.log(`Server uruchomiony na ${domain}`);
    });
}

module.exports = app;
