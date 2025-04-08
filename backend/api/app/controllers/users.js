const User = require('../db/models/user');
const mongoose = require('mongoose');
const argon2 = require('argon2'); // Replaced bcrypt with argon2
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
                    argon2.hash(req.body.password) // Replaced bcrypt.hash with argon2.hash
                        .then(hash => {
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
                        })
                        .catch(err => {
                            return res.status(500).json({
                                error: err
                            });
                        });
                }
            })
            .catch(error => {
                res.status(500).json({
                    error: error
                });
            });
    }

    login(req, res, next) {
        console.log("Login request received with email:", req.body.email); // Log the email from the request

        User.findOne({ email: req.body.email })
            .exec()
            .then(user => {
                if (!user) {
                    console.log("No user found with email:", req.body.email); // Log if no user is found
                    return res.status(401).json({
                        message: 'Auth failed'
                    });
                }
                console.log("User found:", user); // Log the user object if found

                argon2.verify(user.password, req.body.password) // Replaced bcrypt.compare with argon2.verify
                    .then(result => {
                        if (result) {
                            console.log("Password verification successful for user:", user.email); // Log successful password verification

                            const token = jwt.sign({
                                email: user.email,
                                userId: user._id
                            }, jsonwebtoken, {
                                expiresIn: '1h'
                            });
                            console.log("Generated token:", token); // Log the generated token

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
                        console.log("Password verification failed for user:", user.email); // Log failed password verification
                        res.status(401).json({
                            message: 'Auth failed'
                        });
                    })
                    .catch(err => {
                        console.error("Error during password verification:", err); // Log any error during password verification
                        res.status(401).json({
                            message: 'Auth failed'
                        });
                    });
            })
            .catch(error => {
                console.error("Error during user lookup:", error); // Log any error during user lookup
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
            argon2.hash(updateOps.password) // Replaced bcrypt.hash with argon2.hash
                .then(hash => {
                    updateOps.password = hash;
                    updateUserInDB(id, updateOps, res);
                })
                .catch(err => {
                    return res.status(500).json({
                        error: err
                    });
                });
        } else {
            updateUserInDB(id, updateOps, res);
        }
    };

<<<<<<< HEAD
    validateToken(req, res, next) {
        const token = req.headers.authorization?.split(" ")[1];
        console.log("Token received:", token);
        if (!token) {
            return res.status(401).json({ message: "No token provided" });
=======
    verifyToken(req, res, next) {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(400).json({
                message: 'Invalid Authorization header format. Expected "Bearer <token>".'
            });
        }

        const token = authHeader.split(' ')[1]; // Extract token
        if (!token) {
            return res.status(401).json({
                message: 'Token not provided'
            });
>>>>>>> 635dec9 (Fix dla kart produktu)
        }

        jwt.verify(token, jsonwebtoken, (err, decoded) => {
            if (err) {
<<<<<<< HEAD
                console.error("JWT verification error:", err.message); // Log the error message
                console.error("Token that caused the error:", token); // Log the token for debugging
                return res.status(401).json({ message: "Invalid or expired token" });
            }
            console.log("Decoded token:", decoded); // Log the decoded token to verify its contents
            return res.status(200).json({ // Explicitly return status 200
                message: "Token is valid",
                userId: decoded.userId,
                email: decoded.email
=======
                return res.status(401).json({
                    message: 'Token is invalid or expired'
                });
            }
            res.status(200).json({
                message: 'Token is valid',
                userData: decoded
>>>>>>> 635dec9 (Fix dla kart produktu)
            });
        });
    }

    logout(req, res, next) {
<<<<<<< HEAD
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({ message: "No token provided" });
        }

        // Add the token to a blacklist (implementation depends on your system)
        blacklistToken(token) // Assuming a function to handle token blacklisting
            .then(() => {
                res.status(200).json({ message: "Logout successful" });
            })
            .catch(error => {
                res.status(500).json({ error: error.message });
            });
=======
        // Inform the client to remove the token
        res.status(200).json({
            message: 'Logout successful. Please remove the token on the client side.'
        });
>>>>>>> 635dec9 (Fix dla kart produktu)
    }
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

// Example function to handle token blacklisting
const blacklistToken = async (token) => {
    // Implement token blacklisting logic here (e.g., store in a database or cache)
    return Promise.resolve(); // Placeholder for actual implementation
};

module.exports = new UsersController();