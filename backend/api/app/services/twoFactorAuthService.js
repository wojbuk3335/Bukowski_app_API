const crypto = require('crypto');

class TwoFactorAuthService {
    constructor() {
        // Przechowywanie kodów weryfikacyjnych w pamięci (w produkcji lepiej użyć Redis)
        this.verificationCodes = new Map();
        this.CODE_EXPIRY = 5 * 60 * 1000; // 5 minut w milisekundach
        this.MAX_ATTEMPTS = 3; // Maksymalna liczba prób weryfikacji
    }

    // Generowanie 6-cyfrowego kodu weryfikacyjnego
    generateVerificationCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    // Przechowywanie kodu weryfikacyjnego dla użytkownika
    storeVerificationCode(userId, code) {
        const expiresAt = Date.now() + this.CODE_EXPIRY;
        
        this.verificationCodes.set(userId, {
            code: code,
            expiresAt: expiresAt,
            attempts: 0,
            createdAt: Date.now()
        });


        
        // Automatyczne usunięcie po wygaśnięciu
        setTimeout(() => {
            this.verificationCodes.delete(userId);

        }, this.CODE_EXPIRY);
    }

    // Weryfikacja kodu
    verifyCode(userId, inputCode) {
        const storedData = this.verificationCodes.get(userId);
        
        if (!storedData) {
            return {
                success: false,
                error: 'Kod weryfikacyjny nie został znaleziony lub wygasł.',
                errorCode: 'CODE_NOT_FOUND'
            };
        }

        // Sprawdzenie czy kod nie wygasł
        if (Date.now() > storedData.expiresAt) {
            this.verificationCodes.delete(userId);
            return {
                success: false,
                error: 'Kod weryfikacyjny wygasł. Zaloguj się ponownie.',
                errorCode: 'CODE_EXPIRED'
            };
        }

        // Sprawdzenie liczby prób
        if (storedData.attempts >= this.MAX_ATTEMPTS) {
            this.verificationCodes.delete(userId);
            return {
                success: false,
                error: 'Przekroczono maksymalną liczbę prób. Zaloguj się ponownie.',
                errorCode: 'MAX_ATTEMPTS_EXCEEDED'
            };
        }

        // Zwiększenie licznika prób
        storedData.attempts += 1;

        // Weryfikacja kodu
        if (storedData.code !== inputCode.toString()) {
            const attemptsLeft = this.MAX_ATTEMPTS - storedData.attempts;
            return {
                success: false,
                error: `Niepoprawny kod weryfikacyjny. Pozostało prób: ${attemptsLeft}`,
                errorCode: 'INVALID_CODE',
                attemptsLeft: attemptsLeft
            };
        }

        // Kod poprawny - usunięcie z pamięci
        this.verificationCodes.delete(userId);
        
        return {
            success: true,
            message: 'Kod weryfikacyjny poprawny'
        };
    }

    // Usunięcie kodu (np. przy wylogowaniu)
    removeCode(userId) {
        const removed = this.verificationCodes.delete(userId);
        if (removed) {
            console.log(`2FA code manually removed for user ${userId}`);
        }
        return removed;
    }

    // Sprawdzenie czy kod istnieje dla użytkownika
    hasActiveCode(userId) {
        const storedData = this.verificationCodes.get(userId);
        if (!storedData) return false;
        
        if (Date.now() > storedData.expiresAt) {
            this.verificationCodes.delete(userId);
            return false;
        }
        
        return true;
    }

    // Pobranie informacji o kodzie (do debugowania)
    getCodeInfo(userId) {
        const storedData = this.verificationCodes.get(userId);
        if (!storedData) return null;

        return {
            hasCode: true,
            expiresAt: new Date(storedData.expiresAt),
            attempts: storedData.attempts,
            maxAttempts: this.MAX_ATTEMPTS,
            timeLeft: Math.max(0, storedData.expiresAt - Date.now())
        };
    }

    // Czyszczenie wygasłych kodów (metoda pomocnicza)
    cleanupExpiredCodes() {
        const now = Date.now();
        let cleanedCount = 0;

        for (const [userId, data] of this.verificationCodes.entries()) {
            if (now > data.expiresAt) {
                this.verificationCodes.delete(userId);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            console.log(`Cleaned up ${cleanedCount} expired 2FA codes`);
        }

        return cleanedCount;
    }

    // Statystyki (do monitorowania)
    getStats() {
        return {
            activeCodes: this.verificationCodes.size,
            codeExpiry: this.CODE_EXPIRY / 1000 / 60, // w minutach
            maxAttempts: this.MAX_ATTEMPTS
        };
    }
}

module.exports = new TwoFactorAuthService();