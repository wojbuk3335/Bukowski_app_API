const express = require('express');
const router = express.Router();
const User = require('../db/models/user');
const mongoose = require('mongoose');

router.post('/signup', (req, res, next) => {
    const user = new User({
        _id: new mongoose.Types.ObjectId(),
        email: req.body.email,
        password: req.body.password
    });
});

module.exports = router;