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


//Routes
router.get('/', JacketsController.getAllJackets);
router.post('/', checkAuth , upload.single('jacketImage'), JacketsController.createJacket);
router.get('/:jacketId', JacketsController.getOneJacket);
router.patch('/:jacketId', checkAuth , JacketsController.updateJacket);
router.delete('/:jacketId', checkAuth ,JacketsController.deleteJacket);

//Export
module.exports = router;