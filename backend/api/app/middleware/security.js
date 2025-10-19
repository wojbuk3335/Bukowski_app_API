const mongoose = require('mongoose');

// 🔒 MIDDLEWARE BEZPIECZEŃSTWA
const securityMiddleware = {
    
    // Walidacja ObjectId MongoDB
    validateObjectId: (req, res, next) => {
        const params = Object.keys(req.params);
        for (const param of params) {
            if (param.includes('Id') && req.params[param]) {
                if (!mongoose.Types.ObjectId.isValid(req.params[param])) {
                    return res.status(400).json({
                        error: `Nieprawidłowy format ID: ${param}`
                    });
                }
            }
        }
        next();
    },

    // Logowanie podejrzanych aktywności
    suspiciousActivityLogger: (req, res, next) => {
        const userAgent = req.get('User-Agent') || '';
        const suspiciousPatterns = [
            /sqlmap/i,
            /nikto/i,
            /nessus/i,
            /nmap/i,
            /burp/i,
            /scanner/i
        ];

        if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
            console.warn(`🚨 PODEJRZANA AKTYWNOŚĆ: ${req.ip} - ${userAgent} - ${req.url}`);
        }
        next();
    },

    // Sprawdzanie długości danych wejściowych
    inputSizeValidator: (maxSize = 10000) => {
        return (req, res, next) => {
            const bodySize = JSON.stringify(req.body).length;
            if (bodySize > maxSize) {
                return res.status(413).json({
                    error: 'Dane wejściowe zbyt duże'
                });
            }
            next();
        };
    },

    // Blokowanie znanych złośliwych IP (przykład)
    ipBlacklist: (req, res, next) => {
        const blacklistedIps = [
            // Dodaj znane złośliwe IP
        ];

        if (blacklistedIps.includes(req.ip)) {
            console.warn(`🚫 ZABLOKOWANE IP: ${req.ip}`);
            return res.status(403).json({
                error: 'Dostęp zabroniony'
            });
        }
        next();
    }
};

module.exports = securityMiddleware;