const jwt = require('jsonwebtoken');
const securityLogger = require('../services/securityLogger');

// Middleware do walidacji IP dla sesji admina
const ipValidator = (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return next(); // Brak tokena, przejdź dalej (będzie obsłużone przez auth middleware)
        }

        const decoded = jwt.decode(token);
        if (!decoded) {
            return next();
        }

        // Pobierz obecny IP
        const currentIP = req.ip || req.connection.remoteAddress;
        
        // Sprawdź czy token zawiera informację o IP (jeśli zostanie dodana)
        if (decoded.loginIP && decoded.loginIP !== currentIP) {
            securityLogger.suspiciousActivity(req, 'IP_MISMATCH', {
                userId: decoded.id,
                tokenIP: decoded.loginIP,
                currentIP: currentIP
            });

            // W trybie development tylko loguj, w produkcji można zablokować
            if (process.env.NODE_ENV === 'production') {
                return res.status(403).json({
                    error: 'Sesja nieważna z powodu zmiany adresu IP',
                    code: 'IP_VALIDATION_FAILED'
                });
            } else {
                console.log('⚠️ IP MISMATCH DETECTED (Development mode - not blocking)');
            }
        }

        next();
    } catch (error) {
        console.error('IP Validation Error:', error);
        next(); // W przypadku błędu, nie blokuj requestu
    }
};

// Middleware do dodawania IP do nowych tokenów
const addIPToToken = (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
        // Jeśli response zawiera token, dodaj IP
        if (data && data.accessToken) {
            try {
                const decoded = jwt.decode(data.accessToken);
                if (decoded) {
                    // Dodaj IP do payload tokena (wymaga przebudowy tokena)
                    const ip = req.ip || req.connection.remoteAddress;
                    
                    // Loguj utworzenie nowej sesji
                    securityLogger.adminAccess(req, decoded.email || 'unknown', 'SESSION_CREATED');
                    
                    // Można tutaj dodać logikę do rebuilding tokena z IP
                    console.log(`🔐 New admin session created for IP: ${ip}`);
                }
            } catch (error) {
                console.error('Error processing token:', error);
            }
        }
        
        originalJson.call(this, data);
    };
    
    next();
};

module.exports = {
    ipValidator,
    addIPToToken
};