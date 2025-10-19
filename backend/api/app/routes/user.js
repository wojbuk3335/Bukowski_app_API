// Ensure the correct path to UsersController
const UsersController = require('../controllers/users'); // Adjusted path

const historyLogger = require('../middleware/historyLogger'); // Adjusted path

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../db/models/user'); // Ensure this path is correct
const jwt = require('jsonwebtoken');
const { route } = require('./jackets');
const jsonwebtoken = require('../config').jsonwebtoken;
const checkAuth = require('../middleware/check-auth'); // Dodaj middleware autoryzacji


// ========== PUBLICZNE ENDPOINTY (bez autoryzacji) ==========
router.post('/signup', historyLogger('users'), UsersController.signup); // Rejestracja - publiczna
router.post('/login', UsersController.login); // Logowanie - publiczne

// ========== ZABEZPIECZONE ENDPOINTY (wymagają autoryzacji) ==========
router.get('/validate-token', checkAuth, UsersController.verifyToken); // Walidacja tokenu
router.get('/verifyToken', checkAuth, UsersController.verifyToken); // Duplikat - też zabezpieczony
router.get('/', checkAuth, UsersController.getAllUsers); // 🔒 Lista użytkowników - tylko dla zalogowanych
router.delete('/:userId', checkAuth, historyLogger('users'), UsersController.deleteUser); // 🔒 Usuwanie użytkowników
router.get('/:userId/references', checkAuth, UsersController.getUserReferencesReport); // 🔒 Raport referencji
router.get('/:userId', checkAuth, UsersController.getOneUser); // 🔒 Dane konkretnego użytkownika
router.put('/:userId', checkAuth, historyLogger('users'), UsersController.updateUser); // 🔒 Aktualizacja użytkownika
router.post('/logout', checkAuth, UsersController.logout); // 🔒 Wylogowanie (z tokenem)

module.exports = router;