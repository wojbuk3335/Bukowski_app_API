const express = require('express');
const router = express.Router();
const GoodsController = require('../controllers/goods');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const historyLogger = require('../middleware/historyLogger');
const checkAuth = require('../middleware/check-auth'); // 🔒 TOWARY - KLUCZOWE ZABEZPIECZENIE

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
router.post('/create-goods', checkAuth, upload.single('Picture'), historyLogger('goods'), GoodsController.createGood); // 🔒 Tworzenie towaru
router.get('/get-all-goods', checkAuth, GoodsController.getAllGoods); // 🔒 Lista wszystkich towarów
router.put('/:goodId', checkAuth, upload.single('Picture'), historyLogger('goods'), GoodsController.updateGood); // 🔒 Aktualizacja towaru
router.delete('/:goodId', checkAuth, historyLogger('goods'), GoodsController.deleteGood); // 🔒 Usuwanie towaru
router.post('/sync-product-names', checkAuth, GoodsController.syncProductNames); // 🔒 Synchronizacja nazw produktów

module.exports = router;