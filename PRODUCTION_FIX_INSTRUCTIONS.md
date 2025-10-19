# 🔒 INSTRUKCJA NAPRAWY SERWERA PRODUKCYJNEGO

## Problem: 401 Unauthorized przy logowaniu

### Przyczyna
Na serwerze produkcyjnym prawdopodobnie brakuje lub jest niepoprawnie skonfigurowana zmienna środowiskowa `JWT_SECRET`.

### Kroki naprawy:

## 1. Połącz się z serwerem produkcyjnym
```bash
ssh twój_użytkownik@bukowskiapp.pl
```

## 2. Znajdź katalog aplikacji
```bash
cd /path/to/your/app  # Zwykle /var/www/app lub podobnie
```

## 3. Sprawdź obecny plik .env
```bash
cat .env
```

## 4. Stwórz/zaktualizuj plik .env z poprawnymi danymi:
```bash
nano .env
```

Zawartość pliku .env (UZUPEŁNIJ własnymi danymi):
```env
# Port aplikacji
PORT=3000

# MongoDB Connection String
DATABASE=mongodb+srv://username:password@cluster.mongodb.net/database_name?retryWrites=true&w=majority

# JWT Secret - KRYTYCZNE! Wygeneruj silny klucz
JWT_SECRET=YourSuperSecureJWTSecretKeyGeneratedWithOpenSSL

# Domena produkcyjna
DOMAIN=https://bukowskiapp.pl

# Środowisko
NODE_ENV=production
```

## 5. Wygeneruj bezpieczny JWT_SECRET (na serwerze):
```bash
openssl rand -base64 64
```

## 6. Sprawdź uprawnienia do pliku .env:
```bash
chmod 600 .env
chown aplikacja_user:aplikacja_group .env
```

## 7. Restart aplikacji
```bash
# Dla PM2:
pm2 restart all

# Dla systemd:
sudo systemctl restart your-app-service

# Dla Docker:
docker-compose restart
```

## 8. Sprawdź logi
```bash
# PM2:
pm2 logs

# systemd:
journalctl -u your-app-service -f

# Docker:
docker-compose logs -f
```

## 9. Test endpointu
```bash
curl -X POST https://bukowskiapp.pl/api/user/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"testpassword"}'
```

## Alternatywna metoda - ustawienie zmiennej bezpośrednio:

Jeśli nie możesz edytować pliku .env, ustaw zmienną przed startem aplikacji:

```bash
export JWT_SECRET="YourSuperSecureJWTSecretKey"
export DATABASE="your_mongodb_connection_string"
export DOMAIN="https://bukowskiapp.pl"
export NODE_ENV="production"

# Następnie restart aplikacji
```

## Sprawdzenie czy działa:
1. Otwórz https://bukowskiapp.pl
2. Spróbuj się zalogować
3. Sprawdź Network tab w DevTools - powinien być status 200, nie 401

## Backup dotychczasowej konfiguracji:
```bash
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
```