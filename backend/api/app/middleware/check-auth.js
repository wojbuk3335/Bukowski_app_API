const jwt = require('jsonwebtoken');
const { jsonwebtoken } = require('../config'); // Używaj config zamiast process.env
const tokenBlacklist = require('../services/tokenBlacklist');
const securityLogger = require('../services/securityLogger');

module.exports = (req, res, next) => {
    try {
        // 🧪 BYPASS TYLKO dla środowiska testowego - NIE dla development!
        if (process.env.NODE_ENV === 'test') {
            req.userData = { 
                userId: 'test-user-id', 
                email: 'test@example.com',
                symbol: 'TestUser',
                role: 'admin'
            };
            return next();
        }

        // 🔒 Logowanie podejrzanych prób dostępu
        const userAgent = req.get('User-Agent') || 'Unknown';
        const ip = req.ip || req.connection.remoteAddress;
        // Sprawdź czy nagłówek Authorization istnieje
        if (!req.headers.authorization) {
            securityLogger.log('UNAUTHORIZED_ACCESS', { reason: 'No token provided' }, req);
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
            securityLogger.log('UNAUTHORIZED_ACCESS', { reason: 'Token is missing' }, req);
            return res.status(401).json({
                message: 'Access denied. Token is missing.'
            });
        }

        // 🔒 Token blacklisting jest obsługiwane przez globalne middleware w app.js

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
