const express = require('express');
const router = express.Router();
const Jacket = require('../db/models/jacket');
const mongoose = require('mongoose');
const checkAuth = require('../middleware/check-auth');
const JacketsController = require('../controllers/jackets');

//Routes
router.get('/', JacketsController.getAllJackets);
router.post('/', checkAuth , JacketsController.createJacket);
router.get('/:jacketId', JacketsController.getOneJacket);
router.patch('/:jacketId', checkAuth , JacketsController.updateJacket);
router.delete('/:jacketId', checkAuth ,JacketsController.deleteJacket);

//Export
module.exports = router;