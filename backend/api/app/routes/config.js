const express = require('express');
const ConfigController = require('../controllers/config');
const checkAuth = require('../middleware/check-auth'); // 🔒 KONFIGURACJA - WRAŻLIWE DANE SYSTEMU
const router = express.Router();

router.get('/', checkAuth, ConfigController.getConfig); // 🔒 Konfiguracja systemu - tylko dla zalogowanych!

module.exports = router;
