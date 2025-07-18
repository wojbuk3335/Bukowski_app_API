const User = require('../db/models/user');
const State = require('../db/models/state');
const Sales = require('../db/models/sales');
const History = require('../db/models/history');
const TransactionHistory = require('../db/models/transactionHistory');
const Transfer = require('../db/models/transfer');
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
            .then(async user => {
                if (user) {
                    return res.status(409).json({
                        message: 'Email already exists'
                    });
                }

                // Check if trying to create a magazyn user and if one already exists
                if (req.body.role === 'magazyn') {
                    const existingMagazyn = await User.findOne({ role: 'magazyn' }).exec();
                    if (existingMagazyn) {
                        return res.status(409).json({
                            message: 'Może istnieć tylko jeden użytkownik z rolą magazyn.'
                        });
                    }
                }

                argon2.hash(req.body.password) // Replaced bcrypt.hash with argon2.hash
                    .then(hash => {
                        // Ensure sellingPoint and location are empty strings for admins, magazyn and dom
                        const newUser = new User({
                            _id: new mongoose.Types.ObjectId(),
                            email: req.body.email,
                                password: hash,
                                symbol: req.body.symbol, // Ensure symbol is provided in the request body
                                sellingPoint: (req.body.role === 'admin' || req.body.role === 'magazyn' || req.body.role === 'dom') ? '' : req.body.sellingPoint, // Ensure sellingPoint is empty for admins, magazyn and dom
                                location: (req.body.role === 'admin' || req.body.role === 'magazyn' || req.body.role === 'dom') ? '' : req.body.location, // Ensure location is empty for admins, magazyn and dom
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
                                        // Check if the error is about magazyn role limitation
                                        if (error.message.includes('magazyn')) {
                                            return res.status(400).json({
                                                message: 'Może istnieć tylko jeden użytkownik z rolą magazyn.'
                                            });
                                        }
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
            })
            .catch(error => {
                res.status(500).json({
                    error: error
                });
            });
    }

    login(req, res, next) {
        User.findOne({ email: req.body.email })
            .exec()
            .then(user => {
                if (!user) {
                    return res.status(401).json({
                        message: 'Auth failed'
                    });
                }

                argon2.verify(user.password, req.body.password) // Replaced bcrypt.compare with argon2.verify
                    .then(result => {
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
                                sellingPoint: user.sellingPoint,
                                location: user.location
                            });
                        }
                        res.status(401).json({
                            message: 'Auth failed'
                        });
                    })
                    .catch(err => {
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
            .select('_id email role symbol sellingPoint location')
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
                            location: doc.location,
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
            .select('_id email symbol role sellingPoint location')
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

    updateUser = async (req, res, next) => {
        const id = req.params.userId;
        const updateOps = {};

        for (const ops of Object.keys(req.body)) {
            updateOps[ops] = req.body[ops];
        }

        if (updateOps.role === 'admin' || updateOps.role === 'magazyn' || updateOps.role === 'dom') {
            updateOps.sellingPoint = null; // Ensure sellingPoint is null for admins, magazyn and dom
            updateOps.location = null; // Ensure location is null for admins, magazyn and dom
        }

        try {
            // Check if trying to change role to 'magazyn' and if another user already has this role
            if (updateOps.role === 'magazyn') {
                const currentUser = await User.findById(id).exec();
                if (!currentUser) {
                    return res.status(404).json({
                        message: 'User not found'
                    });
                }

                // Only check if user is not already a magazyn user
                if (currentUser.role !== 'magazyn') {
                    const existingMagazyn = await User.findOne({ role: 'magazyn' }).exec();
                    if (existingMagazyn) {
                        return res.status(409).json({
                            message: 'Może istnieć tylko jeden użytkownik z rolą magazyn.'
                        });
                    }
                }
            }

            if (updateOps.password) {
                const hash = await argon2.hash(updateOps.password);
                updateOps.password = hash;
            }
            
            await updateUserInDB(id, updateOps, res);
        } catch (err) {
            console.error('Error in updateUser:', err);
            return res.status(500).json({
                error: err.message || err
            });
        }
    };

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
        }

        jwt.verify(token, jsonwebtoken, (err, decoded) => {
            if (err) {
                return res.status(401).json({
                    message: 'Token is invalid or expired'
                });
            }
            res.status(200).json({
                message: 'Token is valid',
                userData: decoded
            });
        });
    }

    logout(req, res, next) {
        // Inform the client to remove the token
        res.status(200).json({
            message: 'Logout successful. Please remove the token on the client side.'
        });
    }

    // Get user references report - shows how many records reference this user
    getUserReferencesReport = async (req, res, next) => {
        const userId = req.params.userId;
        
        try {
            const user = await User.findById(userId).exec();
            if (!user) {
                return res.status(404).json({
                    message: 'User not found'
                });
            }

            const report = await getUserReferencesCount(user);
            
            res.status(200).json({
                message: 'User references report',
                user: {
                    _id: user._id,
                    email: user.email,
                    symbol: user.symbol,
                    sellingPoint: user.sellingPoint,
                    role: user.role
                },
                references: report
            });
        } catch (error) {
            console.error('Error getting user references report:', error);
            res.status(500).json({
                error: error.message || error
            });
        }
    };
}

const updateUserInDB = async (id, updateOps, res) => {
    try {
        // Get the current user data before update
        const currentUser = await User.findById(id).exec();
        if (!currentUser) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        const oldSymbol = currentUser.symbol;
        const oldSellingPoint = currentUser.sellingPoint;
        const newSymbol = updateOps.symbol;
        const newSellingPoint = updateOps.sellingPoint;

        // Update the user
        const result = await User.updateOne({ _id: id }, { $set: updateOps }).exec();

        // Perform cascading updates if symbol or sellingPoint changed
        const promises = [];

        if (newSymbol && newSymbol !== oldSymbol) {
            console.log(`Updating symbol from "${oldSymbol}" to "${newSymbol}" across collections`);
            promises.push(updateSymbolReferences(oldSymbol, newSymbol));
        }

        if (newSellingPoint !== undefined && newSellingPoint !== oldSellingPoint) {
            console.log(`Updating sellingPoint from "${oldSellingPoint}" to "${newSellingPoint}" across collections`);
            promises.push(updateSellingPointReferences(currentUser._id, oldSellingPoint, newSellingPoint));
        }

        // Wait for all cascading updates to complete
        if (promises.length > 0) {
            await Promise.all(promises);
            console.log('All cascading updates completed successfully');
        }

        res.status(200).json({
            message: 'User updated',
            cascadingUpdates: promises.length > 0 ? 'References updated across collections' : 'No cascading updates needed',
            request: {
                type: 'GET',
                url: `${config.domain}/api/user/${id}`
            }
        });
    } catch (error) {
        console.error('Error updating user with cascading updates:', error);
        res.status(500).json({
            error: error.message || error
        });
    }
};

// Function to update symbol references across collections
const updateSymbolReferences = async (oldSymbol, newSymbol) => {
    const updates = [];

    try {
        // Update Sales collection
        const salesUpdate = await Sales.updateMany(
            { symbol: oldSymbol },
            { $set: { symbol: newSymbol } }
        );
        console.log(`Updated ${salesUpdate.modifiedCount} sales records with new symbol`);

        // Update TransactionHistory collection - multiple fields
        const transactionHistoryUpdate1 = await TransactionHistory.updateMany(
            { targetSymbol: oldSymbol },
            { $set: { targetSymbol: newSymbol } }
        );
        console.log(`Updated ${transactionHistoryUpdate1.modifiedCount} transaction history records (targetSymbol)`);

        // Update processedItems.originalSymbol in TransactionHistory
        const transactionHistoryUpdate2 = await TransactionHistory.updateMany(
            { 'processedItems.originalSymbol': oldSymbol },
            { $set: { 'processedItems.$.originalSymbol': newSymbol } }
        );
        console.log(`Updated ${transactionHistoryUpdate2.modifiedCount} transaction history processed items (originalSymbol)`);

        return {
            salesUpdated: salesUpdate.modifiedCount,
            transactionHistoryTargetSymbol: transactionHistoryUpdate1.modifiedCount,
            transactionHistoryProcessedItems: transactionHistoryUpdate2.modifiedCount
        };
    } catch (error) {
        console.error('Error updating symbol references:', error);
        throw error;
    }
};

// Function to update sellingPoint references across collections
const updateSellingPointReferences = async (userId, oldSellingPoint, newSellingPoint) => {
    try {
        // Update Sales collection (sellingPoint as string)
        const salesUpdate = await Sales.updateMany(
            { sellingPoint: oldSellingPoint },
            { $set: { sellingPoint: newSellingPoint } }
        );
        console.log(`Updated ${salesUpdate.modifiedCount} sales records with new sellingPoint`);

        // Update History collection (from and to fields as strings)
        const historyFromUpdate = await History.updateMany(
            { from: oldSellingPoint },
            { $set: { from: newSellingPoint } }
        );
        console.log(`Updated ${historyFromUpdate.modifiedCount} history records (from field)`);

        const historyToUpdate = await History.updateMany(
            { to: oldSellingPoint },
            { $set: { to: newSellingPoint } }
        );
        console.log(`Updated ${historyToUpdate.modifiedCount} history records (to field)`);

        // Update TransactionHistory collection
        const transactionHistorySelectedUpdate = await TransactionHistory.updateMany(
            { selectedSellingPoint: oldSellingPoint },
            { $set: { selectedSellingPoint: newSellingPoint } }
        );
        console.log(`Updated ${transactionHistorySelectedUpdate.modifiedCount} transaction history records (selectedSellingPoint)`);

        const transactionHistoryTargetUpdate = await TransactionHistory.updateMany(
            { targetSellingPoint: oldSellingPoint },
            { $set: { targetSellingPoint: newSellingPoint } }
        );
        console.log(`Updated ${transactionHistoryTargetUpdate.modifiedCount} transaction history records (targetSellingPoint)`);

        // Update processedItems.sellingPoint in TransactionHistory
        const transactionHistoryProcessedUpdate = await TransactionHistory.updateMany(
            { 'processedItems.sellingPoint': oldSellingPoint },
            { $set: { 'processedItems.$.sellingPoint': newSellingPoint } }
        );
        console.log(`Updated ${transactionHistoryProcessedUpdate.modifiedCount} transaction history processed items (sellingPoint)`);

        // Update Transfer collection
        const transferFromUpdate = await Transfer.updateMany(
            { transfer_from: oldSellingPoint },
            { $set: { transfer_from: newSellingPoint } }
        );
        console.log(`Updated ${transferFromUpdate.modifiedCount} transfer records (transfer_from)`);

        const transferToUpdate = await Transfer.updateMany(
            { transfer_to: oldSellingPoint },
            { $set: { transfer_to: newSellingPoint } }
        );
        console.log(`Updated ${transferToUpdate.modifiedCount} transfer records (transfer_to)`);

        // Note: State collection uses ObjectId reference, so it will automatically 
        // reference the correct user when the user document is updated
        console.log('State collection uses ObjectId reference - no update needed');

        return {
            salesUpdated: salesUpdate.modifiedCount,
            historyFromUpdated: historyFromUpdate.modifiedCount,
            historyToUpdated: historyToUpdate.modifiedCount,
            transactionHistorySelectedUpdated: transactionHistorySelectedUpdate.modifiedCount,
            transactionHistoryTargetUpdated: transactionHistoryTargetUpdate.modifiedCount,
            transactionHistoryProcessedUpdated: transactionHistoryProcessedUpdate.modifiedCount,
            transferFromUpdated: transferFromUpdate.modifiedCount,
            transferToUpdated: transferToUpdate.modifiedCount
        };
    } catch (error) {
        console.error('Error updating sellingPoint references:', error);
        throw error;
    }
};

// Function to get count of references for a user across all collections
const getUserReferencesCount = async (user) => {
    try {
        const symbol = user.symbol;
        const sellingPoint = user.sellingPoint;
        const userId = user._id;

        const report = {
            bySymbol: {},
            bySellingPoint: {},
            byUserId: {}
        };

        // Count references by symbol
        if (symbol) {
            report.bySymbol.sales = await Sales.countDocuments({ symbol });
            report.bySymbol.transactionHistoryTargetSymbol = await TransactionHistory.countDocuments({ targetSymbol: symbol });
            report.bySymbol.transactionHistoryProcessedItems = await TransactionHistory.countDocuments({ 'processedItems.originalSymbol': symbol });
        }

        // Count references by sellingPoint
        if (sellingPoint) {
            report.bySellingPoint.state = await State.countDocuments({ sellingPoint: userId }); // ObjectId reference
            report.bySellingPoint.sales = await Sales.countDocuments({ sellingPoint });
            report.bySellingPoint.historyFrom = await History.countDocuments({ from: sellingPoint });
            report.bySellingPoint.historyTo = await History.countDocuments({ to: sellingPoint });
            report.bySellingPoint.transactionHistorySelected = await TransactionHistory.countDocuments({ selectedSellingPoint: sellingPoint });
            report.bySellingPoint.transactionHistoryTarget = await TransactionHistory.countDocuments({ targetSellingPoint: sellingPoint });
            report.bySellingPoint.transactionHistoryProcessedItems = await TransactionHistory.countDocuments({ 'processedItems.sellingPoint': sellingPoint });
            report.bySellingPoint.transferFrom = await Transfer.countDocuments({ transfer_from: sellingPoint });
            report.bySellingPoint.transferTo = await Transfer.countDocuments({ transfer_to: sellingPoint });
        }

        // Count references by userId
        report.byUserId.history = await History.countDocuments({ userloggedinId: userId });
        report.byUserId.transactionHistory = await TransactionHistory.countDocuments({ userloggedinId: userId });

        // Calculate totals
        report.totals = {
            symbolReferences: Object.values(report.bySymbol).reduce((sum, count) => sum + count, 0),
            sellingPointReferences: Object.values(report.bySellingPoint).reduce((sum, count) => sum + count, 0),
            userIdReferences: Object.values(report.byUserId).reduce((sum, count) => sum + count, 0)
        };

        report.totals.allReferences = report.totals.symbolReferences + report.totals.sellingPointReferences + report.totals.userIdReferences;

        return report;
    } catch (error) {
        console.error('Error getting user references count:', error);
        throw error;
    }
};

// Example function to handle token blacklisting
const blacklistToken = async (token) => {
    // Implement token blacklisting logic here (e.g., store in a database or cache)
    return Promise.resolve(); // Placeholder for actual implementation
};

module.exports = new UsersController();