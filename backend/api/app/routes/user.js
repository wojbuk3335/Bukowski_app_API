// Ensure the correct path to UsersController
const UsersController = require('../controllers/users'); // Adjusted path

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../db/models/user'); // Ensure this path is correct
const jwt = require('jsonwebtoken');
const { route } = require('./jackets');
const jsonwebtoken = require('../config').jsonwebtoken;

//signup a user
router.post('/signup', UsersController.signup);
router.post('/login', UsersController.login);
router.get('/validate-token', UsersController.verifyToken); // Added route for token validation
router.get('/', UsersController.getAllUsers);
router.get('/verifyToken', UsersController.verifyToken); // Changed to GET method
router.delete('/:userId', UsersController.deleteUser);
router.get('/:userId', UsersController.getOneUser);
router.put('/:userId', UsersController.updateUser);
router.post('/logout', UsersController.logout); // Add route for logout

router.post('/logout', UsersController.logout);

module.exports = router;