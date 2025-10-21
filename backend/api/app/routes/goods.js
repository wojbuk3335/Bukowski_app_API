const express = require('express');
const router = express.Router();
const GoodsController = require('../controllers/goods');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const historyLogger = require('../middleware/historyLogger');
const checkAuth = require('../middleware/check-auth'); // 🔒 TOWARY - KLUCZOWE ZABEZPIECZENIE
const validators = require('../middleware/validators'); // 🔒 WALIDACJA DANYCH

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../../public/images');
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // Limit file size to 5MB
});

// ========== WSZYSTKIE OPERACJE NA TOWARACH WYMAGAJĄ AUTORYZACJI ==========
router.post('/create-goods', 
    validators.productValidation,
    validators.handleValidationErrors,
    checkAuth, 
    upload.single('Picture'), 
    historyLogger('goods'), 
    GoodsController.createGood
); // 🔒 Tworzenie towaru z walidacją

router.get('/get-all-goods', 
    validators.queryValidation,
    validators.handleValidationErrors,
    checkAuth, 
    GoodsController.getAllGoods
); // 🔒 Lista towarów z walidacją query

router.put('/:goodId', 
    validators.mongoIdValidation,
    validators.productValidation,
    validators.handleValidationErrors,
    checkAuth, 
    upload.single('Picture'), 
    historyLogger('goods'), 
    GoodsController.updateGood
); // 🔒 Aktualizacja towaru z walidacją

router.delete('/:goodId', 
    validators.mongoIdValidation,
    validators.handleValidationErrors,
    checkAuth, 
    historyLogger('goods'), 
    GoodsController.deleteGood
); // 🔒 Usuwanie towaru z walidacją ID

router.post('/sync-product-names', 
    checkAuth, 
    GoodsController.syncProductNames
); // 🔒 Synchronizacja nazw produktów

// Print selection endpoints
router.post('/print-selections', GoodsController.updatePrintSelectionBulk);
router.get('/print-selections', GoodsController.getPrintSelections);

module.exports = router;