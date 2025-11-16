# ROZWIĄZANIE: Dedykowane konto email dla aplikacji

## PROBLEM:
Każdy admin musiałby zmieniać ustawienia swojego prywatnego Gmaila, co nie ma sensu.

## ROZWIĄZANIE: Stwórz systemowe konto email

### Krok 1: Utwórz nowe konto Gmail dla aplikacji
1. Idź do https://accounts.google.com/signup
2. Utwórz nowe konto, np:
   - `bukowskiapp.system@gmail.com`
   - `noreply.bukowskiapp@gmail.com` 
   - `admin.bukowskiapp@gmail.com`

### Krok 2: Skonfiguruj nowe konto
1. Zaloguj się na nowe konto
2. W ustawieniach Gmail ustaw nazwę wyświetlaną jako "BukowskiApp"
3. Włącz weryfikację 2FA
4. Wygeneruj hasło aplikacji

### Krok 3: Zaktualizuj konfigurację aplikacji
W pliku `backend/api/.env` zmień na nowe dane:

```properties
SMTP_USER=bukowskiapp.system@gmail.com
SMTP_PASS=nowe-haslo-aplikacji-16-znakow
EMAIL_FROM=BukowskiApp <bukowskiapp.system@gmail.com>
```

### Krok 4: Zrestartuj serwer
```bash
cd backend/api
npm restart
```

## ZALETY TEGO ROZWIĄZANIA:
- ✅ Jeden email systemowy dla całej aplikacji
- ✅ Niezależne od osobistych kont adminów
- ✅ Profesjonalny wygląd emaili
- ✅ Łatwe zarządzanie
- ✅ Możliwość monitorowania wysłanych emaili

## ALTERNATYWA: Użyj serwisu email

### SendGrid (darmowe 100 emaili/dzień):
1. Załóż konto na https://sendgrid.com
2. Zweryfikuj domenę lub email
3. Pobierz API key
4. Zmień kod w `emailService.js`:

```javascript
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async sendVerificationCode(email, code) {
    const msg = {
        to: email,
        from: 'BukowskiApp <noreply@bukowskiapp.com>',
        subject: 'Kod weryfikacyjny - BukowskiApp',
        html: `...`
    };
    
    await sgMail.send(msg);
}
```

## REKOMENDACJA:
Użyj dedykowanego konta Gmail - to najszybsze i najprostsze rozwiązanie.