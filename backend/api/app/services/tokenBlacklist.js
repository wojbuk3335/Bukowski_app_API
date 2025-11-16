// 🔒 TOKEN BLACKLIST SERVICE - Unieważnianie tokenów
class TokenBlacklistService {
    constructor() {
        this.blacklistedTokens = new Set();
        this.tokenCreationTimes = new Map();
        
        // Czyść stare tokeny co godzinę
        setInterval(() => {
            this.cleanupExpiredTokens();
        }, 60 * 60 * 1000); // 1 godzina
    }

    // Dodaj token do blacklisty
    blacklistToken(token) {
        if (token) {
            this.blacklistedTokens.add(token);
            this.markTokenCreationTime(token);
        }
    }

    // Sprawdź czy token jest na blackliście
    isTokenBlacklisted(token) {
        return this.blacklistedTokens.has(token);
    }

    // Usuń wygasłe tokeny z blacklisty (optymalizacja pamięci)
    cleanupExpiredTokens() {
        // Tokeny JWT wygasają po określonym czasie, więc można je usunąć z blacklisty
        // Po 24 godzinach (większość tokenów powinna już wygasnąć)
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        
        // Usuń stare wpisy z mapy czasów utworzenia
        for (const [token, creationTime] of this.tokenCreationTimes.entries()) {
            if (creationTime < oneDayAgo) {
                this.blacklistedTokens.delete(token);
                this.tokenCreationTimes.delete(token);
            }
        }


    }

    // Zaznacz czas utworzenia tokena (dla cleanup)
    markTokenCreationTime(token) {
        this.tokenCreationTimes.set(token, Date.now());
    }

    // Wyloguj użytkownika ze wszystkich sesji
    blacklistAllUserTokens(userId) {
        // W prawdziwej aplikacji przechowywałbyś mapę userId -> tokens
        // Tutaj jako uproszczenie dodamy znacznik, że wszystkie tokeny użytkownika są nieważne
        const userTokenMarker = `USER_${userId}_LOGOUT_${Date.now()}`;
        this.blacklistedTokens.add(userTokenMarker);
    }

    // Middleware do sprawdzania blacklisty
    checkTokenBlacklist() {
        return (req, res, next) => {
            try {
                const authHeader = req.headers.authorization;
                if (authHeader && authHeader.startsWith('Bearer ')) {
                    const token = authHeader.split(' ')[1];
                    
                    if (this.isTokenBlacklisted(token)) {
                        // Loguj użycie blacklistowanego tokenu
                        const securityLogger = require('./securityLogger');
                        securityLogger.log('BLACKLISTED_TOKEN_USAGE', { 
                            token: token.substring(0, 20) + '...'
                        }, req);
                        
                        return res.status(401).json({
                            message: 'Token został unieważniony. Zaloguj się ponownie.',
                            code: 'TOKEN_BLACKLISTED'
                        });
                    }
                }
                next();
            } catch (error) {
                next(); // Nie blokuj żądania z powodu błędu
            }
        };
    }

    // Statystyki
    getStats() {
        return {
            blacklistedTokensCount: this.blacklistedTokens.size,
            trackedTokensCount: this.tokenCreationTimes.size
        };
    }
}

module.exports = new TokenBlacklistService();