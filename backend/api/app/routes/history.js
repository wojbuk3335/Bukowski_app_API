const express = require('express');
const router = express.Router();
const historyController = require('../controllers/history');

router.get('/', historyController.getAllHistory);
//delete all history
router.delete('/remove', historyController.removeAllHistory);

module.exports = router;
