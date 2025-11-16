// 🔧 TYMCZASOWY ENDPOINT DO DEBUGOWANIA UŻYTKOWNIKÓW
// Usuń ten plik po rozwiązaniu problemu!

const express = require('express');
const router = express.Router();
const User = require('../db/models/user');

// UWAGA: Ten endpoint pokazuje wrażliwe dane! 
// Używaj tylko do debugowania i usuń przed produkcją!
router.get('/debug-users', async (req, res) => {
    try {
        // Pobierz wszystkich użytkowników (bez hasła)
        const users = await User.find({}, {
            email: 1,
            role: 1,
            symbol: 1,
            sellingPoint: 1,
            location: 1,
            createdAt: 1
        }).exec();

        res.status(200).json({
            message: '🔧 DEBUG: Lista użytkowników w bazie',
            count: users.length,
            users: users,
            note: 'USUŃ TEN ENDPOINT PO DEBUGOWANIU!'
        });
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

// Sprawdź czy konkretny email istnieje
router.get('/debug-user/:email', async (req, res) => {
    try {
        const email = req.params.email;
        const user = await User.findOne({ email }, {
            email: 1,
            role: 1,
            symbol: 1,
            sellingPoint: 1,
            location: 1,
            createdAt: 1
        }).exec();

        if (user) {
            res.status(200).json({
                message: '✅ Użytkownik znaleziony',
                user: user
            });
        } else {
            res.status(404).json({
                message: '❌ Użytkownik nie istnieje w bazie',
                searchedEmail: email
            });
        }
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

module.exports = router;