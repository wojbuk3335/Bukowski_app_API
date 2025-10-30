const fs = require('fs');
const path = require('path');

class SecurityLogger {
    constructor() {
        this.logFile = path.join(__dirname, '../logs/security.log');
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    log(event, details, req) {
        const timestamp = new Date().toISOString();
        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        const userAgent = req.get('User-Agent') || 'unknown';
        
        const logEntry = {
            timestamp,
            event,
            ip,
            userAgent,
            url: req.url,
            method: req.method,
            details
        };

        // Log do pliku
        const logLine = JSON.stringify(logEntry) + '\n';
        fs.appendFileSync(this.logFile, logLine);

        // Security events are logged to file only for production readiness
    }

    // Różne typy zdarzeń bezpieczeństwa
    failedLogin(req, email, reason) {
        this.log('FAILED_LOGIN', { email, reason }, req);
    }

    rateLimitHit(req, limitType) {
        this.log('RATE_LIMIT_HIT', { limitType }, req);
    }

    suspiciousActivity(req, activity, details) {
        this.log('SUSPICIOUS_ACTIVITY', { activity, details }, req);
    }

    adminAccess(req, adminEmail, action) {
        this.log('ADMIN_ACCESS', { adminEmail, action }, req);
    }

    dataAccess(req, userId, dataType, recordCount) {
        this.log('DATA_ACCESS', { userId, dataType, recordCount }, req);
    }

    sqlInjectionAttempt(req, payload) {
        this.log('SQL_INJECTION_ATTEMPT', { payload }, req);
    }

    twoFactorFailure(req, email, attempts) {
        this.log('2FA_FAILURE', { email, attempts }, req);
    }
}

module.exports = new SecurityLogger();