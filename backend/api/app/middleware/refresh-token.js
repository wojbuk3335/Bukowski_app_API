const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { jsonwebtoken } = require('../config');

// 🔒 SYSTEM REFRESH TOKENÓW
class RefreshTokenManager {
    constructor() {
        // W produkcji: użyj Redis lub bazy danych
        this.refreshTokens = new Map(); // Tymczasowo w pamięci
        this.tokenExpiry = new Map();
    }

    // Generuj parę tokenów (access + refresh)
    generateTokenPair(userData) {
        const accessToken = jwt.sign({
            email: userData.email,
            userId: userData.userId,
            role: userData.role,
            symbol: userData.symbol,
            sellingPoint: userData.sellingPoint
        }, jsonwebtoken, {
            expiresIn: '15m' // 🔒 Krótszy czas dla access token
        });

        const refreshToken = crypto.randomBytes(64).toString('hex');
        const expiryTime = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 dni

        // Zapisz refresh token
        this.refreshTokens.set(refreshToken, userData);
        this.tokenExpiry.set(refreshToken, expiryTime);

        return { accessToken, refreshToken };
    }

    // Odśwież access token używając refresh token
    refreshAccessToken(refreshToken) {
        if (!this.refreshTokens.has(refreshToken)) {
            throw new Error('Invalid refresh token');
        }

        const expiryTime = this.tokenExpiry.get(refreshToken);
        if (Date.now() > expiryTime) {
            this.refreshTokens.delete(refreshToken);
            this.tokenExpiry.delete(refreshToken);
            throw new Error('Refresh token expired');
        }

        const userData = this.refreshTokens.get(refreshToken);
        
        // Generuj nowy access token
        const newAccessToken = jwt.sign({
            email: userData.email,
            userId: userData.userId,
            role: userData.role,
            symbol: userData.symbol,
            sellingPoint: userData.sellingPoint
        }, jsonwebtoken, {
            expiresIn: '15m'
        });

        return newAccessToken;
    }

    // Usuń refresh token (logout)
    revokeRefreshToken(refreshToken) {
        this.refreshTokens.delete(refreshToken);
        this.tokenExpiry.delete(refreshToken);
    }

    // Cleanup wygasłych tokenów
    cleanup() {
        const now = Date.now();
        for (const [token, expiry] of this.tokenExpiry.entries()) {
            if (now > expiry) {
                this.refreshTokens.delete(token);
                this.tokenExpiry.delete(token);
            }
        }
    }
}

// Singleton instance
const refreshTokenManager = new RefreshTokenManager();

// Cleanup co godzinę
setInterval(() => {
    refreshTokenManager.cleanup();
}, 60 * 60 * 1000);

module.exports = refreshTokenManager;