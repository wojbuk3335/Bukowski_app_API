const express = require("express");
const router = express.Router();
const SizesController = require('../controllers/sizes');
const historyLogger = require('../middleware/historyLogger');

router.get('/', SizesController.getAllSizes); // Add root GET route
router.get('/get-all-sizes', SizesController.getAllSizes);
router.post('/insert-many-sizes',historyLogger('sizes'),SizesController.insertManySizes);
router.delete('/delete-all-sizes',historyLogger('sizes'),SizesController.deleteAllSizes);
router.get('/:sizeId', SizesController.getSizeById);
router.patch('/update-size/:sizeId',historyLogger('sizes'), SizesController.updateSizeById);

module.exports = router;