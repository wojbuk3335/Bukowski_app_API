# INSTRUKCJE: Zmiana nazwy nadawcy w Gmail dla 2FA

## PROBLEM:
Emaile z weryfikacją 2FA przychodzą od "wbukowski1985@gmail.com" zamiast od "BukowskiApp" lub "Bukowski App"

## ROZWIĄZANIE 1: Zmiana nazwy wyświetlanej w Gmail

### Krok 1: Zmień nazwę w ustawieniach Gmail
1. Idź do https://mail.google.com
2. Kliknij ikonę koła zębatego (Settings)
3. Wybierz "See all settings"
4. Przejdź do zakładki "Accounts and Import"
5. W sekcji "Send mail as" znajdź swój adres email
6. Kliknij "edit info" obok swojego adresu
7. Zmień "Name" z "wbukowski1985" na "BukowskiApp" lub "Bukowski App"
8. Kliknij "Save Changes"

### Krok 2: Sprawdź ustawienia aplikacji
W pliku `backend/api/app/services/emailService.js` upewnij się że masz:

```javascript
from: 'BukowskiApp <wbukowski1985@gmail.com>'
```

## ROZWIĄZANIE 2: Użyj dedykowanego konta email dla aplikacji

### Utwórz nowe konto Gmail:
1. Utwórz nowe konto: bukowskiapp.official@gmail.com
2. Ustaw nazwę wyświetlaną jako "BukowskiApp"
3. Włącz weryfikację 2FA
4. Wygeneruj hasło aplikacji
5. Zaktualizuj dane w .env:

```properties
SMTP_USER=bukowskiapp.official@gmail.com
SMTP_PASS=nowe-haslo-aplikacji
EMAIL_FROM=BukowskiApp <bukowskiapp.official@gmail.com>
```

## ROZWIĄZANIE 3: Użyj zewnętrznego serwisu email

### Mailgun, SendGrid, lub AWS SES:
- Pozwalają na pełną kontrolę nad nadawcą
- Lepsza dostarczalność emaili
- Profesjonalny wygląd

### Przykład konfiguracji dla SendGrid:
```javascript
// W emailService.js
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const msg = {
  to: email,
  from: 'noreply@bukowskiapp.pl', // Zweryfikowana domena
  subject: 'Kod weryfikacyjny - BukowskiApp',
  // ...
};
```

## ROZWIĄZANIE 4: Użyj własnej domeny email

### Jeśli masz domenę bukowskiapp.pl:
1. Skonfiguruj MX rekordy
2. Utwórz konto: noreply@bukowskiapp.pl
3. Użyj SMTP swojego hostingu
4. Pełna kontrola nad nadawcą

```properties
SMTP_HOST=mail.bukowskiapp.pl
SMTP_USER=noreply@bukowskiapp.pl
SMTP_PASS=haslo-konta
EMAIL_FROM=BukowskiApp <noreply@bukowskiapp.pl>
```

## TESTOWANIE:

Po każdej zmianie:
1. Zrestartuj serwer backend
2. Przetestuj logowanie z 2FA
3. Sprawdź jak wyświetla się nadawca w kliencjie email

## UWAGA:
Niektóre klienty email (Outlook, Apple Mail) mogą nadal wyświetlać adres email zamiast nazwy, ale większość nowoczesnych klientów (Gmail, Thunderbird) będzie wyświetlać ustawioną nazwę.