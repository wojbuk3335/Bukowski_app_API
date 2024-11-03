const express = require("express");
const router = express.Router();
const SizesController = require('../controllers/sizes');

router.get('/get-all-sizes', SizesController.getAllSizes);
router.post('/insert-many-sizes', SizesController.insertManySizes);
router.delete('/delete-all-sizes', SizesController.deleteAllSizes);
router.get('/:sizeId', SizesController.getSizeById);
router.patch('/update-size/:sizeId', SizesController.updateSizeById);

module.exports = router;