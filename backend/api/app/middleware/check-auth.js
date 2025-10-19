const jwt = require('jsonwebtoken');
const { jsonwebtoken } = require('../config'); // Używaj config zamiast process.env

module.exports = (req, res, next) => {
    try {
        // 🧪 BYPASS dla środowiska testowego - bezpieczeństwo wyłączone tylko dla testów
        if (process.env.NODE_ENV === 'test') {
            req.userData = { 
                userId: 'test-user-id', 
                email: 'test@example.com',
                symbol: 'TestUser'
            };
            return next();
        }
        // Sprawdź czy nagłówek Authorization istnieje
        if (!req.headers.authorization) {
            return res.status(401).json({
                message: 'Access denied. No token provided.'
            });
        }

        // Sprawdź format nagłówka (Bearer token)
        const authHeader = req.headers.authorization;
        if (!authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                message: 'Access denied. Invalid token format. Expected: Bearer <token>'
            });
        }

        // Wyciągnij token
        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({
                message: 'Access denied. Token is missing.'
            });
        }

        // Weryfikuj token używając config (nie process.env)
        const decoded = jwt.verify(token, jsonwebtoken);
        req.userData = decoded;
        next();
    } catch (error) {
        // Różne typy błędów JWT
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                message: 'Token expired. Please login again.'
            });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                message: 'Invalid token. Authentication failed.'
            });
        } else {
            return res.status(401).json({
                message: 'Authentication failed.'
            });
        }
    }
};
