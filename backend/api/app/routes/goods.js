const express = require('express');
const router = express.Router();
const GoodsController = require('../controllers/goods');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const historyLogger = require('../middleware/historyLogger');

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

router.post('/create-goods', upload.single('Picture'),historyLogger('goods'), GoodsController.createGood);
router.get('/get-all-goods', GoodsController.getAllGoods);
router.put('/:goodId', upload.single('Picture'),historyLogger('goods'), GoodsController.updateGood);
router.delete('/:goodId',historyLogger('goods'), GoodsController.deleteGood);
router.post('/sync-product-names', GoodsController.syncProductNames);

module.exports = router;