// Ensure the correct path to UsersController
const UsersController = require('../controllers/users'); // Adjusted path

const historyLogger = require('../middleware/historyLogger'); // Adjusted path
const validators = require('../middleware/validators'); // 🔒 WALIDACJA DANYCH

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../db/models/user'); // Ensure this path is correct
const jwt = require('jsonwebtoken');
const { route } = require('./jackets');
const jsonwebtoken = require('../config').jsonwebtoken;
const checkAuth = require('../middleware/check-auth'); // Dodaj middleware autoryzacji


// ========== PUBLICZNE ENDPOINTY (bez autoryzacji) ==========
router.post('/signup', 
    validators.signupValidation, 
    validators.handleValidationErrors, 
    historyLogger('users'), 
    UsersController.signup
); // 🔒 Rejestracja z walidacją

router.post('/login', 
    validators.loginValidation, 
    validators.handleValidationErrors, 
    UsersController.login
); // 🔒 Logowanie z walidacją

router.post('/refresh-token', UsersController.refreshToken); // 🔒 Odświeżanie tokenu - publiczne

// ========== ENDPOINTY 2FA (publiczne - przed pełnym logowaniem) ==========
router.post('/verify-2fa', 
    UsersController.verifyTwoFactorCode
); // 🔒 Weryfikacja kodu 2FA

router.post('/resend-2fa', 
    UsersController.resendTwoFactorCode
); // 🔒 Ponowne wysłanie kodu 2FA

router.get('/2fa-status/:userId', 
    UsersController.getTwoFactorStatus
); // 🔒 Status 2FA (debug)

// ========== ZABEZPIECZONE ENDPOINTY (wymagają autoryzacji) ==========
router.get('/validate-token', checkAuth, UsersController.verifyToken); // Walidacja tokenu
router.get('/verifyToken', checkAuth, UsersController.verifyToken); // Duplikat - też zabezpieczony
router.get('/', UsersController.getAllUsers); // � TYMCZASOWO WYŁĄCZONE DLA DEVELOPMENTU

router.delete('/:userId', 
    validators.mongoIdValidation,
    validators.handleValidationErrors,
    checkAuth, 
    historyLogger('users'), 
    UsersController.deleteUser
); // 🔒 Usuwanie użytkowników z walidacją

router.get('/:userId/references', 
    validators.mongoIdValidation,
    validators.handleValidationErrors,
    checkAuth, 
    UsersController.getUserReferencesReport
); // 🔒 Raport referencji z walidacją

router.get('/:userId', 
    validators.mongoIdValidation,
    validators.handleValidationErrors,
    checkAuth, 
    UsersController.getOneUser
); // 🔒 Dane użytkownika z walidacją

router.put('/:userId', 
    validators.mongoIdValidation,
    validators.signupValidation, // Użyj tej samej walidacji co przy signup
    validators.handleValidationErrors,
    checkAuth, 
    historyLogger('users'), 
    UsersController.updateUser
); // 🔒 Aktualizacja użytkownika z walidacją

router.post('/logout', checkAuth, UsersController.logout); // 🔒 Wylogowanie (z tokenem)

module.exports = router;