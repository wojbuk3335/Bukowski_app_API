const User = require('../db/models/user');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const jsonwebtoken = require('../config').jsonwebtoken;
const config = require('../config');

class UsersController {
    // ... other methods ...

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
                            // Ensure sellingPoint is an empty string for admins
                            const newUser = new User({
                                _id: new mongoose.Types.ObjectId(),
                                email: req.body.email,
                                password: hash,
                                symbol: req.body.symbol, // Ensure symbol is provided in the request body
                                sellingPoint: req.body.role === 'admin' ? '' : req.body.sellingPoint, // Ensure sellingPoint is empty for admins
                                role: req.body.role // Assuming role is provided in the request body
                            });
                            newUser.save()
                                .then(result => {
                                    res.status(201).json({
                                        message: 'User created',
                                        role: newUser.role,
                                        request: {
                                            type: 'GET',
                                            url: `${config.domain}/api/user/${result._id}`
                                        },
                                        success: true,
                                        email: newUser.email
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
                            token: token,
                            userId: user._id,
                            email: user.email,
                            success: true,
                            role: user.role,
                            symbol: user.symbol,
                            sellingPoint: user.sellingPoint
                        });
                    }
                    res.status(401).json({
                        message: 'Auth failed'
                    });
                });
            })
            .catch(error => {
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
                        url: `${config.domain}/api/user`,
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
            .select('_id email role symbol sellingPoint')
            .exec()
            .then(docs => {
                const response = {
                    count: docs.length,
                    users: docs.map(doc => {
                        return {
                            _id: doc._id,
                            email: doc.email,
                            role: doc.role,
                            symbol: doc.symbol,
                            sellingPoint: doc.sellingPoint,
                            request: {
                                type: 'GET',
                                url: `${config.domain}/api/user/${doc._id}`
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
            .select('_id email symbol role sellingPoint')
            .exec()
            .then(doc => {
                if (doc) {
                    res.status(200).json({
                        user: doc,
                        request: {
                            type: 'GET',
                            url: `${config.domain}/api/user`
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

    updateUser = (req, res, next) => {
        const id = req.params.userId;
        const updateOps = {};

        for (const ops of Object.keys(req.body)) {
            updateOps[ops] = req.body[ops];
        }

        if (updateOps.role === 'admin') {
            updateOps.sellingPoint = null; // Ensure sellingPoint is null for admins
        }

        if (updateOps.password) {
            bcrypt.hash(updateOps.password, 10, (err, hash) => {
                if (err) {
                    return res.status(500).json({
                        error: err
                    });
                } else {
                    updateOps.password = hash;
                    updateUserInDB(id, updateOps, res);
                }
            });
        } else {
            updateUserInDB(id, updateOps, res);
        }
    };
}

const updateUserInDB = (id, updateOps, res) => {
    User.updateOne({ _id: id }, { $set: updateOps })
        .exec()
        .then(result => {
            res.status(200).json({
                message: 'User updated',
                request: {
                    type: 'GET',
                    url: `${config.domain}/api/user/${id}`
                }
            });
        })
        .catch(error => {
            res.status(500).json({
                error: error
            });
        });
};

module.exports = new UsersController();