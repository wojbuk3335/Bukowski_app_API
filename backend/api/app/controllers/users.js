const User = require('../db/models/user');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

class UsersController {
    signup(req, res, next) {
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
    }
}

module.exports = new UsersController();

