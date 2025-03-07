const express = require('express');
const ConfigController = require('../controllers/config');
const router = express.Router();

router.get('/', ConfigController.getConfig);

module.exports = router;
