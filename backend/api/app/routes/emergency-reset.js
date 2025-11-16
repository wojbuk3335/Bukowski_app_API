// 🚨 TYMCZASOWY ENDPOINT DO RESETOWANIA HASŁA
// USUŃ TEN PLIK NATYCHMIAST PO NAPRAWIE PROBLEMU!

const express = require('express');
const router = express.Router();
const User = require('../db/models/user');
const argon2 = require('argon2');

// 🚨 NIEBEZPIECZNY ENDPOINT - TYLKO DO NAPRAWY!
// Pozwala zmienić hasło bez autoryzacji
router.post('/emergency-password-reset', async (req, res) => {
    try {
        const { email, newPassword, confirmPassword, emergencyKey } = req.body;
        
        // Prosty klucz bezpieczeństwa
        if (emergencyKey !== 'bukowski_emergency_2025') {
            return res.status(403).json({
                message: '❌ Nieprawidłowy klucz bezpieczeństwa'
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                message: '❌ Hasła nie są identyczne'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                message: '❌ Hasło musi mieć minimum 6 znaków'
            });
        }

        // Znajdź użytkownika
        const user = await User.findOne({ email }).exec();
        if (!user) {
            return res.status(404).json({
                message: '❌ Użytkownik nie istnieje',
                email: email
            });
        }

        // Zaszyfruj nowe hasło
        const hashedPassword = await argon2.hash(newPassword);

        // Zaktualizuj hasło
        await User.updateOne(
            { email: email },
            { $set: { password: hashedPassword } }
        ).exec();

        res.status(200).json({
            message: '✅ Hasło zostało zresetowane pomyślnie!',
            email: email,
            warning: '🚨 USUŃ TEN ENDPOINT NATYCHMIAST PO UŻYCIU!'
        });

    } catch (error) {
        console.error('Emergency password reset error:', error);
        res.status(500).json({
            message: '❌ Błąd podczas resetowania hasła',
            error: error.message
        });
    }
});

// Endpoint do sprawdzenia czy użytkownik istnieje
router.get('/check-user/:email', async (req, res) => {
    try {
        const email = req.params.email;
        const user = await User.findOne({ email }, {
            email: 1,
            role: 1,
            symbol: 1,
            sellingPoint: 1,
            createdAt: 1
        }).exec();

        if (user) {
            res.status(200).json({
                message: '✅ Użytkownik istnieje',
                user: user
            });
        } else {
            res.status(404).json({
                message: '❌ Użytkownik nie istnieje',
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