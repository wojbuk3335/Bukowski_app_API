const WalletsCategory = require('../db/models/walletsCategory');
const mongoose = require('mongoose');

class WalletsCategoryController {
    async getAllWalletsCategories(req, res, next) {
        WalletsCategory.find()
            .select('_id Kat_1_Kod_1 Kat_1_Opis_1 Plec number_id')
            .then(walletsCategories => {
                res.status(200).json({
                    count: walletsCategories.length,
                    walletCategories: walletsCategories.map(walletsCategory => ({
                        _id: walletsCategory._id,
                        Kat_1_Kod_1: walletsCategory.Kat_1_Kod_1,
                        Kat_1_Opis_1: walletsCategory.Kat_1_Opis_1,
                        Plec: walletsCategory.Plec,
                        number_id: walletsCategory.number_id
                    }))
                });
            })
            .catch(err => {
                res.status(500).json({
                    error: {
                        message: err.message
                    }
                });
            });
    }

    async insertManyWalletsCategories(req, res, next) {
        const walletCategoriesToInsert = req.body;

        if (!Array.isArray(walletCategoriesToInsert) || walletCategoriesToInsert.length === 0) {
            return res.status(400).json({ message: 'Invalid input: expected an array of wallet categories' });
        }

        try {
            // Filtruj puste rekordy i rekordy bez Kat_1_Kod_1
            const validWalletCategories = walletCategoriesToInsert.filter(walletCategory => {
                const kod = String(walletCategory.Kat_1_Kod_1 || '').trim();
                return kod !== '' && kod !== 'Kat_1_Kod_1'; // odfiltruj nagłówki
            });

            if (validWalletCategories.length === 0) {
                return res.status(400).json({ message: 'No valid wallet categories found after filtering' });
            }

            const formattedWalletCategories = validWalletCategories.map((walletCategory) => ({
                _id: new mongoose.Types.ObjectId(),
                Kat_1_Kod_1: String(walletCategory.Kat_1_Kod_1),
                Kat_1_Opis_1: String(walletCategory.Kat_1_Opis_1 || ''),
                Plec: String(walletCategory.Plec || ''),
                number_id: Number(walletCategory.number_id) || 0
            }));

            const result = await WalletsCategory.insertMany(formattedWalletCategories);
            
            res.status(201).json({
                message: 'Wallet categories created successfully',
                count: result.length,
                createdWalletCategories: result
            });
        } catch (error) {
            res.status(500).json({
                error: {
                    message: error.message
                }
            });
        }
    }

    async updateManyWalletsCategories(req, res, next) {
        const walletCategoriesToUpdate = req.body;

        if (!Array.isArray(walletCategoriesToUpdate) || walletCategoriesToUpdate.length === 0) {
            return res.status(400).json({ message: 'Invalid input: expected an array of wallet categories to update' });
        }

        try {
            const updatePromises = walletCategoriesToUpdate.map(walletCategory => {
                return WalletsCategory.updateOne(
                    { _id: walletCategory._id },
                    {
                        $set: {
                            Kat_1_Kod_1: walletCategory.Kat_1_Kod_1,
                            Kat_1_Opis_1: walletCategory.Kat_1_Opis_1,
                            Plec: walletCategory.Plec,
                            number_id: walletCategory.number_id
                        }
                    }
                );
            });

            const results = await Promise.all(updatePromises);
            const modifiedCount = results.reduce((sum, result) => sum + result.modifiedCount, 0);

            res.status(200).json({
                message: 'Wallet categories updated successfully',
                modifiedCount: modifiedCount
            });
        } catch (error) {
            res.status(500).json({
                error: {
                    message: error.message
                }
            });
        }
    }

    async updateWalletsCategory(req, res, next) {
        const id = req.params.walletsCategoryId;
        const updateData = {
            Kat_1_Opis_1: req.body.Kat_1_Opis_1,
            Plec: req.body.Plec
        };

        WalletsCategory.updateOne({ _id: id }, { $set: updateData })
            .then(result => {
                if (result.modifiedCount > 0) {
                    return res.status(200).json({
                        message: 'Wallet category updated successfully'
                    });
                } else {
                    return res.status(404).json({
                        message: 'Wallet category not found or no changes made'
                    });
                }
            })
            .catch(error => {
                res.status(500).json({
                    error: {
                        message: error.message
                    }
                });
            });
    }

    async deleteAllWalletsCategories(req, res, next) {
        WalletsCategory.deleteMany({})
            .then(result => {
                res.status(200).json({
                    message: 'All wallet categories deleted successfully',
                    deletedCount: result.deletedCount
                });
            })
            .catch(error => {
                res.status(500).json({
                    error: {
                        message: error.message
                    }
                });
            });
    }
}

module.exports = WalletsCategoryController;