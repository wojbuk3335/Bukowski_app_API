# INSTRUKCJE TESTOWANIA SYSTEMU 2FA

## 1. KONFIGURACJA EMAILA

### Dla Gmail:
1. Idź do ustawień konta Google: https://myaccount.google.com/
2. Włącz weryfikację dwuetapową
3. Wygeneruj hasło aplikacji: https://myaccount.google.com/apppasswords
4. Edytuj plik `backend/api/.env`:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=twój-email@gmail.com
   SMTP_PASS=wygenerowane-hasło-aplikacji
   ```

### Dla Outlook/Hotmail:
```
SMTP_HOST=smtp.outlook.com
SMTP_PORT=587
SMTP_USER=twój-email@outlook.com
SMTP_PASS=twoje-hasło
```

## 2. TESTOWANIE SYSTEMU

### Backend (Terminal 1):
```bash
cd backend/api
npm start
```

### Frontend (Terminal 2):
```bash
cd frontend
npm start
```

## 3. FLOW TESTOWANIA

1. **Idź do http://localhost:3001/admin**
2. **Zaloguj się danymi admina**
   - Email: admin@example.com (lub twoje dane admina)
   - Hasło: [twoje hasło]
   - ✅ Zaznacz "Zapamiętaj mnie" (opcjonalnie)

3. **Po prawidłowym loginie zostaniesz przekierowany do weryfikacji 2FA**
   - Sprawdź email na podany adres
   - Wprowadź 6-cyfrowy kod weryfikacyjny
   - Kod jest ważny przez 5 minut

4. **Po weryfikacji zostaniesz zalogowany do panelu admina**

## 4. FUNKCJONALNOŚCI 2FA

- ✅ **Automatyczne wysyłanie kodu na email**
- ✅ **6-cyfrowy kod weryfikacyjny**  
- ✅ **Ważność kodu: 5 minut**
- ✅ **Maksymalnie 3 próby weryfikacji**
- ✅ **Możliwość ponownego wysłania kodu**
- ✅ **Timer odliczający do wygaśnięcia**
- ✅ **Powrót do ekranu logowania**
- ✅ **Automatyczne uzupełnianie pól (auto-focus)**
- ✅ **Responsywny design zachowany z logowaniem**

## 5. ZABEZPIECZENIA

- 🔒 **Tylko dla adminów** - zwykli użytkownicy logują się normalnie
- 🔒 **Kody przechowywane w pamięci** - automatyczne czyszczenie
- 🔒 **Rate limiting** - maksymalnie 3 próby weryfikacji
- 🔒 **Automatyczne wygasanie** - 5 minut na kod
- 🔒 **Bezpieczne tokeny JWT** - po udanej weryfikacji

## 6. MOŻLIWE PROBLEMY

### Email nie dochodzi:
- Sprawdź folder spam/junk
- Upewnij się że SMTP_USER i SMTP_PASS są poprawne
- Sprawdź czy Gmail ma włączone hasło aplikacji

### Błąd połączenia SMTP:
- Sprawdź czy firewall nie blokuje portu 587
- Spróbuj portu 465 z secure: true

### Błędy weryfikacji:
- Sprawdź logi backendu w konsoli
- Upewnij się że userId jest przekazywane poprawnie

## 7. DEBUGOWANIE

Sprawdź status 2FA:
```
GET http://localhost:3000/api/user/2fa-status/USER_ID
```

Sprawdź logi w konsoli backendu:
- 📧 Wysyłanie emaila
- ✅ Poprawna weryfikacja  
- ❌ Błędy weryfikacji

## 8. PRODUKCJA

Przed wdrożeniem na produkcję:
1. Zmień SMTP_USER i SMTP_PASS na produkcyjne
2. Ustaw NODE_ENV=production
3. Sprawdź czy serwer SMTP jest dostępny z serwera produkcyjnego
4. Przetestuj całkowity flow 2FA