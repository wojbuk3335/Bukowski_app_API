const { body, param, query, validationResult } = require('express-validator');

// 🔒 WALIDATORY DANYCH WEJŚCIOWYCH
const validators = {
    
    // Middleware do sprawdzania wyników walidacji
    handleValidationErrors: (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.warn(`⚠️ BŁĘDY WALIDACJI: ${req.ip} - ${req.method} ${req.url}`, errors.array());
            return res.status(400).json({
                message: 'Nieprawidłowe dane wejściowe',
                errors: errors.array()
            });
        }
        next();
    },

    // Walidacja logowania - bardziej restrykcyjna dla bezpieczeństwa
    loginValidation: [
        body('email')
            .isEmail()
            .withMessage('Nieprawidłowy format email'),
        body('password')
            .isLength({ min: 6 })
            .withMessage('Hasło musi mieć minimum 6 znaków')
            .custom((value, { req }) => {
                // Loguj podejrzane próby z bardzo krótkimi hasłami
                if (value && value.length < 4) {
                    const securityLogger = require('../services/securityLogger');
                    securityLogger.log('VERY_SHORT_PASSWORD_ATTEMPT', {
                        passwordLength: value.length,
                        email: req.body.email
                    }, req);
                }
                return true;
            })
    ],

    // Walidacja rejestracji
    signupValidation: [
        body('email')
            .isEmail()
            // .normalizeEmail() - USUNIETE: zachowaj kropki w emailach
            .withMessage('Nieprawidłowy format email'),
        body('password')
            .isLength({ min: 8 })
            .withMessage('Hasło musi mieć minimum 8 znaków')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
            .withMessage('Hasło musi zawierać małą literę, wielką literę, cyfrę i znak specjalny'),
        body('symbol')
            .isLength({ min: 1, max: 20 })
            .matches(/^[A-Z0-9_]+$/)
            .withMessage('Symbol może zawierać tylko wielkie litery, cyfry i _'),
        body('role')
            .isIn(['admin', 'magazyn', 'dom', 'user'])
            .withMessage('Nieprawidłowa rola')
    ],

    // Walidacja ID MongoDB
    mongoIdValidation: [
        param('id').optional().isMongoId().withMessage('Nieprawidłowy format ID'),
        param('goodId').optional().isMongoId().withMessage('Nieprawidłowy format ID towaru'),
        param('userId').optional().isMongoId().withMessage('Nieprawidłowy format ID użytkownika'),
        param('salesId').optional().isMongoId().withMessage('Nieprawidłowy format ID sprzedaży')
    ],

    // Walidacja danych sprzedażowych
    salesValidation: [
        body('sellingPoint')
            .isLength({ min: 1, max: 50 })
            .trim()
            .withMessage('Punkt sprzedaży jest wymagany (1-50 znaków)'),
        body('symbol')
            .isLength({ min: 1, max: 20 })
            .matches(/^[A-Z0-9_]+$/)
            .withMessage('Symbol może zawierać tylko wielkie litery, cyfry i _'),
        body('amount')
            .optional()
            .isNumeric()
            .isFloat({ min: 0 })
            .withMessage('Kwota musi być liczbą dodatnią')
    ],

    // Walidacja danych produktowych
    productValidation: [
        body('fullName')
            .optional()
            .isLength({ min: 1, max: 100 })
            .trim()
            .escape() // Escape HTML
            .withMessage('Nazwa produktu jest wymagana (1-100 znaków)'),
        body('price')
            .optional()
            .isNumeric()
            .isFloat({ min: 0 })
            .withMessage('Cena musi być liczbą dodatnią'),
        body('quantity')
            .optional()
            .isInt({ min: 0 })
            .withMessage('Ilość musi być liczbą całkowitą dodatnią')
    ],

    // Walidacja zapytań (query parameters)
    queryValidation: [
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Numer strony musi być liczbą dodatnią'),
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Limit musi być między 1 a 100'),
        query('search')
            .optional()
            .isLength({ max: 100 })
            .trim()
            .escape()
            .withMessage('Fraza wyszukiwania może mieć maksymalnie 100 znaków')
    ],

    // Walidacja dat
    dateValidation: [
        body('startDate')
            .optional()
            .isISO8601()
            .withMessage('Nieprawidłowy format daty początkowej'),
        body('endDate')
            .optional()
            .isISO8601()
            .withMessage('Nieprawidłowy format daty końcowej')
    ],

    // Walidacja danych toreb/portfeli
    bagValidation: [
        body('name')
            .isLength({ min: 1, max: 100 })
            .trim()
            .escape()
            .withMessage('Nazwa torby jest wymagana (1-100 znaków)'),
        body('category')
            .optional()
            .isLength({ min: 1, max: 50 })
            .trim()
            .withMessage('Kategoria może mieć maksymalnie 50 znaków'),
        body('size')
            .optional()
            .isLength({ min: 1, max: 20 })
            .trim()
            .withMessage('Rozmiar może mieć maksymalnie 20 znaków')
    ],

    // Walidacja danych magazynowych
    warehouseValidation: [
        body('quantity')
            .isInt({ min: 0 })
            .withMessage('Ilość musi być liczbą całkowitą nieujemną'),
        body('location')
            .optional()
            .isLength({ min: 1, max: 50 })
            .trim()
            .withMessage('Lokalizacja może mieć maksymalnie 50 znaków')
    ],

    // Walidacja przesyłek/transferów
    transferValidation: [
        body('transfer_from')
            .isLength({ min: 1, max: 50 })
            .trim()
            .withMessage('Punkt źródłowy jest wymagany'),
        body('transfer_to')
            .isLength({ min: 1, max: 50 })
            .trim()
            .withMessage('Punkt docelowy jest wymagany'),
        body('quantity')
            .isInt({ min: 1 })
            .withMessage('Ilość musi być liczbą całkowitą dodatnią')
    ]
};

module.exports = validators;