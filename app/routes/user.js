const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../db/models/user'); // Ensure this path is correct
const jwt = require('jsonwebtoken');
const jsonwebtoken = require('../config').jsonwebtoken;


//signup a user
router.post('/signup', (req, res, next) => {
    User.findOne({ email: req.body.email })
        .exec()
        .then(user => {
            if (user) {
                return res.status(409).json({
                    message: 'Email already exists'
                });
            } else {
                bcrypt.hash(req.body.password, 10, (err, hash) => {
                    if (err) {
                        return res.status(500).json({
                            error: err
                        });
                    } else {
                        const newUser = new User({
                            _id: new mongoose.Types.ObjectId(),
                            email: req.body.email,
                            password: hash
                        });
                        newUser.save()
                            .then(result => {
                                res.status(201).json({
                                    message: 'User created'
                                });
                            })
                            .catch(error => {
                                if (error.name === 'ValidationError') {
                                    return res.status(400).json({
                                        message: 'Invalid email format'
                                    });
                                }
                                res.status(500).json({
                                    error: error
                                });
                            });
                    }
                });
            }
        })
        .catch(error => {
            res.status(500).json({
                error: error
            });
        });
});

//login a user
router.post('/login', (req, res, next) => {
    User.findOne({ email: req.body.email })
        .exec()
        .then(user => {
            if (!user) {
                return res.status(401).json({
                    message: 'Auth failed'
                });
            }
            bcrypt.compare(req.body.password, user.password, (err, result) => {
                if (err) {
                    return res.status(401).json({
                        message: 'Auth failed'
                    });
                }
                if (result) {
                    const token = jwt.sign({
                        email: user.email,
                        userId: user._id
                    }, jsonwebtoken, {
                        expiresIn: '1h'
                    });
                    return res.status(200).json({
                        message: 'Auth successful',
                        token: token
                    });
                }
                res.status(401).json({
                    message: 'Auth failed'
                });
            });
        })
        .catch(error => {
            console.log(error);
            res.status(500).json({
                error: error
            });
        });
}
);

// Delete a user by ID
router.delete('/:userId', (req, res, next) => {
    const id = req.params.userId;
    User.deleteOne({ _id: id })
        .then(result => {
            res.status(200).json({
                message: 'User deleted',
                request: {
                    type: 'POST',
                    url: 'http://localhost:3000/user',
                    body: { email: 'String', password: 'String' }
                }
            });
        })
        .catch(error => {
            res.status(500).json({
                error: error
            });
        });
});
module.exports = router;