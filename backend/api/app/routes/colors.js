const express = require("express");
const router = express.Router();
const ColorsController = require('../controllers/colors');
const historyLogger = require('../middleware/historyLogger');

router.get('/get-all-colors', ColorsController.getAllColors);
router.post('/insert-many-colors',historyLogger('colors'), ColorsController.insertManyColors);
router.delete('/delete-all-colors',historyLogger('colors'), ColorsController.deleteAllColors);
router.get('/:colorId', ColorsController.getColorById);
router.patch('/update-color/:colorId',historyLogger('colors'), ColorsController.updateColorById);

module.exports = router;