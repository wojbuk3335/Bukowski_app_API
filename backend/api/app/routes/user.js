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
router.get('/', UsersController.getAllUsers);
router.delete('/:userId', UsersController.deleteUser);
router.get('/:userId', UsersController.getOneUser);
module.exports = router;