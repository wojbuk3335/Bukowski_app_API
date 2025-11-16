# 🚀 INSTRUKCJE WDROŻENIA - Migracja pola rowBackgroundColor

## 📋 CHECKLIST PRZED WDROŻENIEM

### 1. Przygotowanie plików
- [x] `migrate_add_row_background_color.js` - gotowy
- [x] `run_migration_row_background_color.sh` - gotowy  
- [x] `run_migration_row_background_color.ps1` - gotowy
- [x] `MIGRATION_ROW_BACKGROUND_COLOR.md` - dokumentacja

### 2. Pliki które należy przegrać na serwer
```bash
# Backend pliki
backend/api/migrate_add_row_background_color.js
backend/api/run_migration_row_background_color.sh
backend/api/run_migration_row_background_color.ps1
backend/api/MIGRATION_ROW_BACKGROUND_COLOR.md

# Frontend (jeśli jeszcze nie przegrane)
frontend/src/components/AdminDashboard/Searchengine/SeachEngineTable/SeachEngineTable.js
```

## 🔧 KROKI WDROŻENIA NA SERWERZE

### Krok 1: Zatrzymanie aplikacji
```bash
# Zatrzymaj serwer aplikacji
pm2 stop bukowski-api
# lub jeśli używasz innego managera procesów
sudo systemctl stop bukowski-app
```

### Krok 2: Backup bazy danych (KRYTYCZNE!)
```bash
# Utwórz backup MongoDB przed migracją
mongodump --db bukowski_inventory --out /backup/$(date +%Y%m%d_%H%M%S)_before_color_migration
```

### Krok 3: Przegranie plików
```bash
# Skopiuj pliki na serwer (zastąp ścieżkami do swojego serwera)
scp migrate_add_row_background_color.js user@server:/path/to/backend/api/
scp run_migration_row_background_color.sh user@server:/path/to/backend/api/
scp MIGRATION_ROW_BACKGROUND_COLOR.md user@server:/path/to/backend/api/

# Ustaw uprawnienia wykonywania dla skryptu bash
chmod +x /path/to/backend/api/run_migration_row_background_color.sh
```

### Krok 4: Uruchomienie migracji
```bash
# Przejdź do katalogu z API
cd /path/to/backend/api

# Sprawdź czy zmienne środowiskowe są dostępne
echo "DB_NAME: $DB_NAME"
echo "MONGODB_URI: $MONGODB_URI"

# Uruchom migrację
./run_migration_row_background_color.sh

# Lub bezpośrednio:
node migrate_add_row_background_color.js
```

### Krok 5: Weryfikacja migracji
```bash
# Sprawdź czy wszystkie produkty mają pole rowBackgroundColor
mongo bukowski_inventory --eval "
db.goods.find({rowBackgroundColor: {\$exists: false}}).count()
"
# Powinno zwrócić 0

# Sprawdź przykładowe produkty
mongo bukowski_inventory --eval "
db.goods.find({}, {fullName: 1, rowBackgroundColor: 1}).limit(3)
"
```

### Krok 6: Restart aplikacji
```bash
# Uruchom ponownie serwer
pm2 start bukowski-api
# lub
sudo systemctl start bukowski-app

# Sprawdź status
pm2 status
# lub
sudo systemctl status bukowski-app
```

### Krok 7: Test funkcjonalności
1. Otwórz aplikację w przeglądarce
2. Przejdź do `/admin/dashboard/searchengine/table`
3. Sprawdź czy kolumna kolorów działa
4. Wybierz kilka kolorów i zapisz
5. Sprawdź czy drukowanie pokazuje kolory

## 🔍 WERYFIKACJA PO WDROŻENIU

### Test 1: Sprawdzenie bazy danych
```javascript
// Połącz się z MongoDB i sprawdź:
db.goods.find({rowBackgroundColor: {$exists: false}}).count()  // powinno być 0
db.goods.find({rowBackgroundColor: {$exists: true}}).count()   // powinno być > 0
db.goods.findOne({}, {rowBackgroundColor: 1})                  // powinno pokazać pole
```

### Test 2: Test API
```bash
# Test GET endpoint
curl -X GET "http://localhost:3001/api/goods/row-colors" \
     -H "Authorization: Bearer YOUR_TOKEN"

# Test POST endpoint
curl -X POST "http://localhost:3001/api/goods/row-colors" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"colors": {"PRODUCT_ID": "#ff0000"}}'
```

### Test 3: Test Frontend
- [ ] Kolumna Color Picker jest widoczna
- [ ] Można wybierać kolory
- [ ] Kolory są zapisywane
- [ ] Kolory są widoczne po odświeżeniu
- [ ] Drukowanie pokazuje kolory

## 🚨 PLAN ROLLBACK (gdyby coś poszło nie tak)

### Opcja 1: Przywrócenie backupu
```bash
# Zatrzymaj aplikację
pm2 stop bukowski-api

# Przywróć backup
mongorestore --db bukowski_inventory --drop /backup/TIMESTAMP_before_color_migration/bukowski_inventory

# Uruchom aplikację
pm2 start bukowski-api
```

### Opcja 2: Usunięcie pola (szybki rollback)
```javascript
// Połącz się z MongoDB i usuń pole
db.goods.updateMany(
  {rowBackgroundColor: {$exists: true}},
  {$unset: {rowBackgroundColor: ""}}
)
```

## 📝 LOGI DO MONITOROWANIA

Po wdrożeniu sprawdź logi:
```bash
# Logi aplikacji
pm2 logs bukowski-api

# Logi systemowe
tail -f /var/log/mongodb/mongod.log

# Logi nginx (jeśli używasz)
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## ⚠️ POTENCJALNE PROBLEMY

### Problem 1: Brak uprawnień MongoDB
```bash
# Rozwiązanie: sprawdź uprawnienia użytkownika MongoDB
mongo --eval "db.runCommand({connectionStatus: 1})"
```

### Problem 2: Błąd połączenia z bazą
```bash
# Sprawdź status MongoDB
sudo systemctl status mongod
# Sprawdź port
netstat -tlnp | grep :27017
```

### Problem 3: Migracja nie działa
```bash
# Sprawdź zmienne środowiskowe
env | grep MONGO
env | grep DB_NAME
```

## 📞 KONTAKT W RAZIE PROBLEMÓW

Jeśli wystąpią problemy:
1. Sprawdź logi migracji
2. Zweryfikuj backup
3. Sprawdź status MongoDB i aplikacji
4. W razie potrzeby uruchom rollback

---
**Ostatnia aktualizacja:** 22 października 2025  
**Wersja:** 1.0  
**Autor:** System migracji kolorów