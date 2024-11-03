const express = require("express");
const router = express.Router();
const ColorsController = require('../controllers/colors');

router.get('/get-all-colors', ColorsController.getAllColors);
router.post('/insert-many-colors', ColorsController.insertManyColors);
router.delete('/delete-all-colors', ColorsController.deleteAllColors);
router.get('/:colorId', ColorsController.getColorById);
router.patch('/update-color/:colorId', ColorsController.updateColorById);

module.exports = router;