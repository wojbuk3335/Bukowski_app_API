const express = require('express');
const router = express.Router();
const Jacket = require('../db/models/jacket');
const mongoose = require('mongoose');
const checkAuth = require('../middleware/check-auth');
const JacketsController = require('../controllers/jackets');
const multer = require('multer');
const fs = require('fs');
const path = require('path');


// Multer
const storage = multer.diskStorage({
    destination: function(req, file, cb){
        cb(null, './uploads/');
    },
    filename: function(req, file, cb){
        cb(null,file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    if(file.mimetype === 'image/jpeg' || file.mimetype === 'image/png'){
        cb(null,true);
    } else {
        cb(null,false);
    }
};

const upload = multer({storage: storage,
    limits: {
    fileSize: 1024 * 1024 * 5
    },
    fileFilter: fileFilter
});


// ========== KURTKI - WSZYSTKIE OPERACJE ZABEZPIECZONE ==========
router.get('/', checkAuth, JacketsController.getAllJackets); // 🔒 Lista kurtek - teraz zabezpieczona!
router.post('/', checkAuth, upload.single('jacketImage'), JacketsController.createJacket); // 🔒 Tworzenie kurtki
router.get('/:jacketId', checkAuth, JacketsController.getOneJacket); // 🔒 Konkretna kurtka - teraz zabezpieczono!
router.patch('/:jacketId', checkAuth, JacketsController.updateJacket); // 🔒 Aktualizacja kurtki
router.delete('/:jacketId', checkAuth, JacketsController.deleteJacket); // 🔒 Usuwanie kurtki

//Export
module.exports = router;