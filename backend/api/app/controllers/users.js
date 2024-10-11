const User = require('../db/models/user');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const jsonwebtoken = require('../config').jsonwebtoken;

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
    login(req, res, next){
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

    deleteUser(req, res, next) {
        const id = req.params.userId;
        User.deleteOne({ _id: id })
            .then(result => {
                res.status(200).json({
                    message: 'User deleted',
                    request: {
                        type: 'POST',
                        url: 'http://localhost:3000/api/user',
                        body: { email: 'String', password: 'String' }
                    }
                });
            })
            .catch(error => {
                res.status(500).json({
                    error: error
                });
            });
    }

    getAllUsers(req, res, next) {
        User.find()
            .select('_id email')
            .exec()
            .then(docs => {
                const response = {
                    count: docs.length,
                    users: docs.map(doc => {
                        return {
                            _id: doc._id,
                            email: doc.email,
                            request: {
                                type: 'GET',
                                url: 'http://localhost:3000/api/user/' + doc._id
                            }
                        }
                    })
                };
                res.status(200).json(response);
            })
            .catch(error => {
                res.status(500).json({
                    error: error
                });
            });
    }

    getOneUser(req, res, next) {
        const id = req.params.userId;
        User.findById(id)
            .select('_id email')
            .exec()
            .then(doc => {
                if (doc) {
                    res.status(200).json({
                        user: doc,
                        request: {
                            type: 'GET',
                            url: 'http://localhost:3000/api/user'
                        }
                    });
                } else {
                    res.status(404).json({
                        message: 'No valid entry found for provided ID'
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

