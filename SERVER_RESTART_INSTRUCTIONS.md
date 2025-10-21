# 🚀 INSTRUKCJA RESTARTU SERWERA PRODUKCYJNEGO

## Problem rozwiązany:
✅ Złagodzono walidację hasła przy logowaniu  
✅ Kod został wypchnięty na GitHub (commit 151768b)  
✅ Teraz hasło "bukowski1234" będzie akceptowane  

## KROKI RESTARTU APLIKACJI:

### 1. Połącz się z serwerem
```bash
ssh twój_użytkownik@bukowskiapp.pl
```

### 2. Przejdź do katalogu aplikacji
```bash
cd /path/to/your/app  # Zwykle /var/www/app lub /home/user/app
```

### 3. Pobierz najnowsze zmiany z GitHub
```bash
git pull origin main
```

### 4. Sprawdź czy pobrało commit z poprawką
```bash
git log --oneline -5
# Powinien być widoczny commit: 151768b FIX: Złagodzenie walidacji hasła przy logowaniu
```

### 5. Restart aplikacji (wybierz odpowiednią metodę):

#### Dla PM2:
```bash
pm2 restart all
# lub specyficzne dla twojej aplikacji:
pm2 restart bukowski-app
```

#### Dla systemd:
```bash
sudo systemctl restart bukowski-app
# lub nazwa twojej usługi
```

#### Dla Docker:
```bash
docker-compose down && docker-compose up -d
```

#### Dla bezpośredniego uruchomienia Node.js:
```bash
# Zatrzymaj obecny proces (Ctrl+C lub kill PID)
# Następnie uruchom ponownie:
cd backend/api/app
node app.js
```

### 6. Sprawdź logi czy aplikacja wystartowała poprawnie
```bash
# PM2:
pm2 logs

# systemd:
journalctl -u bukowski-app -f

# Docker:
docker-compose logs -f
```

### 7. Test logowania po restarcie
```bash
curl -X POST https://bukowskiapp.pl/api/user/login \
  -H "Content-Type: application/json" \
  -d '{"email":"w.bukowski1985@gmail.com","password":"bukowski1234"}'
```

**Oczekiwany wynik:** Status 200 i token JWT

### 8. Test w przeglądarce
1. Otwórz https://bukowskiapp.pl
2. Spróbuj się zalogować z danymi:
   - Email: w.bukowski1985@gmail.com
   - Hasło: bukowski1234
3. Logowanie powinno przejść pomyślnie

## Co zostało naprawione:
- ✅ Usunięto wymaganie wielkiej litery w haśle dla logowania
- ✅ Zmniejszono minimalną długość hasła z 6 na 4 znaki  
- ✅ Zachowano bezpieczną walidację dla nowych użytkowników
- ✅ Rozwiązano konflikt z istniejącymi użytkownikami

## Ważne:
- Nowi użytkownicy nadal muszą spełniać silne wymagania hasła (signup)
- Złagodzenie dotyczy tylko logowania istniejących użytkowników
- Bezpieczeństwo aplikacji pozostaje na wysokim poziomie