const winston = require('winston');
const fs = require('fs');
const path = require('path');

// 📁 Utwórz folder logs
const logsDir = 'logs';
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// 🔧 KONFIGURACJA LOGGERA
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'bukowski-api' },
    transports: [
        // 📝 Error logs
        new winston.transports.File({ 
            filename: path.join(logsDir, 'error.log'), 
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        
        // 📝 Combined logs
        new winston.transports.File({ 
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        
        // 🔒 Security logs
        new winston.transports.File({
            filename: path.join(logsDir, 'security.log'),
            level: 'warn',
            maxsize: 5242880, // 5MB
            maxFiles: 10
        }),
        
        // 📊 Access logs
        new winston.transports.File({
            filename: path.join(logsDir, 'access.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 7
        })
    ],
});

// 💻 Development console
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

// 🔒 SECURITY LOGGER
const securityLogger = {
    loginAttempt: (email, ip, success) => {
        logger.warn('Login attempt', {
            email,
            ip,
            success,
            timestamp: new Date().toISOString(),
            type: 'authentication'
        });
    },
    
    unauthorizedAccess: (endpoint, ip, userAgent) => {
        logger.error('Unauthorized access attempt', {
            endpoint,
            ip,
            userAgent,
            timestamp: new Date().toISOString(),
            type: 'security_violation'
        });
    },
    
    rateLimitExceeded: (ip, endpoint) => {
        logger.warn('Rate limit exceeded', {
            ip,
            endpoint,
            timestamp: new Date().toISOString(),
            type: 'rate_limit'
        });
    },
    
    suspiciousActivity: (description, ip, data) => {
        logger.error('Suspicious activity detected', {
            description,
            ip,
            data,
            timestamp: new Date().toISOString(),
            type: 'security_alert'
        });
    }
};

module.exports = { logger, securityLogger };