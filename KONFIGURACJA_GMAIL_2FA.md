# KONFIGURACJA GMAIL DLA 2FA

## KROKI KONFIGURACJI:

### 1. Włącz weryfikację dwuetapową w Gmail
1. Idź do https://myaccount.google.com/security
2. W sekcji "Signing in to Google" kliknij "2-Step Verification"
3. Włącz weryfikację dwuetapową (jeśli nie jest już włączona)

### 2. Wygeneruj hasło aplikacji
1. Idź do https://myaccount.google.com/apppasswords
2. Wybierz "Mail" jako aplikację
3. Wybierz "Other (custom name)" jako urządzenie
4. Wpisz nazwę: "Bukowski App 2FA"
5. Kliknij "Generate"
6. **SKOPIUJ WYGENEROWANE 16-ZNAKOWE HASŁO**

### 3. Zaktualizuj plik .env
Edytuj plik: `backend/api/.env`

```properties
# 🔐 EMAIL CONFIGURATION FOR 2FA
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=wbukowski1985@gmail.com
SMTP_PASS=TUTAJ-WKLEJ-16-ZNAKOWE-HASLO-APLIKACJI
EMAIL_FROM=Bukowski App <wbukowski1985@gmail.com>
```

### 4. Przykład prawidłowej konfiguracji:
```properties
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=wbukowski1985@gmail.com
SMTP_PASS=abcd efgh ijkl mnop
EMAIL_FROM=Bukowski App <wbukowski1985@gmail.com>
```

### 5. Zrestartuj serwer
```bash
cd backend/api
npm start
```

### 6. Testuj system 2FA
1. Idź do http://localhost:3001/admin
2. Zaloguj się danymi admina
3. Sprawdź czy otrzymasz email z kodem
4. Wprowadź kod i kontynuuj

## ROZWIĄZYWANIE PROBLEMÓW:

### Email nie dociera:
- Sprawdź folder spam/junk
- Upewnij się że hasło aplikacji jest poprawne
- Sprawdź czy weryfikacja dwuetapowa jest włączona

### Błąd "Invalid login":
- Nie używaj zwykłego hasła Gmail - tylko hasło aplikacji
- Upewnij się że skopiowałeś całe 16-znakowe hasło
- Usuń spacje z hasła aplikacji w pliku .env

### Błąd połączenia:
- Sprawdź firewall (port 587)
- Spróbuj portu 465 z secure: true

### Testowy email z konsoli Node.js:
```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: 'wbukowski1985@gmail.com',
        pass: 'TWOJE-HASLO-APLIKACJI'
    }
});

transporter.sendMail({
    from: 'wbukowski1985@gmail.com',
    to: 'wbukowski1985@gmail.com',
    subject: 'Test 2FA',
    text: 'Test połączenia SMTP dla 2FA'
}, (error, info) => {
    if (error) {
        console.log('Błąd:', error);
    } else {
        console.log('Email wysłany:', info.messageId);
    }
});
```