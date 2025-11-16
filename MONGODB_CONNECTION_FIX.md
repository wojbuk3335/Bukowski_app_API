# Instrukcje aktualizacji serwera produkcyjnego

## Problem rozwiązany! ✅

Znaleźliśmy przyczynę problemu i rozwiązanie:

### Co było nie tak:
1. **Connection string format** - aplikacja używała niepoprawnego formatu połączenia z MongoDB
2. **Timeout problemy** - baza danych była dostępna, ale format połączenia powodował timeout

### Rozwiązanie:
**Działający format connection string:**
```
mongodb://server846283_bukowskiapp:Jezusmoimpanem30!@mongodb.server846283.nazwa.pl:4005/server846283_bukowskiapp
```

### Co zostało zrobione:
1. ✅ Przetestowano różne formaty connection string
2. ✅ Znaleziono działający format
3. ✅ Zaktualizowano lokalne pliki .env
4. ✅ Dodano skrypt testowy `test_complete_login.js`
5. ✅ Wypchnieto zmiany do repozytorium

### Następne kroki na serwerze:

```bash
# 1. Aktualizacja kodu z GitHub
cd /home/server846283/bukowskiapp/backend/backend/api/app
git pull origin main

# 2. Test systemu logowania
node test_complete_login.js

# 3. Restart aplikacji (Phusion Passenger)
touch tmp/restart.txt

# 4. Test logowania przez API
curl -X POST https://bukowskiapp.pl/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"w.bukowski1985@gmail.com","password":"Jezusmoimpanem30!"}'
```

### Oczekiwany rezultat:
- Sukces połączenia z MongoDB
- Znalezienie użytkownika w bazie
- Poprawna weryfikacja hasła
- Zwrócenie JWT tokena przy logowaniu

### Hasło użytkownika:
- **Email:** w.bukowski1985@gmail.com  
- **Hasło:** Jezusmoimpanem30!

Aplikacja powinna teraz działać poprawnie! 🎉