# 🎨 INSTRUKCJE MIGRACJI - ROW BACKGROUND COLORS

## 📋 Kroki do wykonania na serwerze przez SSH:

### 1. Połącz się z serwerem przez SSH
```bash
ssh your_username@your_server_ip
```

### 2. Przejdź do katalogu API
```bash
cd /var/www/Bukowski_app_API/Bukowski_app_API/backend/api
```

### 3. Sprawdź czy pliki migracji istnieją
```bash
ls -la migrate_add_row_colors.js run_migration.sh
```

### 4. Nadaj uprawnienia wykonywania skryptowi
```bash
chmod +x run_migration.sh
```

### 5. Uruchom migrację
```bash
./run_migration.sh
```

**LUB bezpośrednio:**
```bash
node migrate_add_row_colors.js
```

## ✅ Co powinieneś zobaczyć po udanej migracji:

```
✅ Connected to MongoDB
📊 Found X products without rowBackgroundColor field
✅ Successfully updated X products with rowBackgroundColor: '#ffffff'
📊 Migration verification:
   Total products: X
   Products with rowBackgroundColor: X
✅ Migration completed successfully!
🎨 All products now have white background color (#ffffff) by default
```

## 🔧 Troubleshooting:

### Problem: "Permission denied"
```bash
chmod +x run_migration.sh
```

### Problem: "node: command not found"
```bash
# Sprawdź wersję Node.js
node --version
# Lub użyj pełnej ścieżki
/usr/bin/node migrate_add_row_colors.js
```

### Problem: "Cannot find module"
```bash
# Sprawdź czy jesteś w dobrej lokalizacji
pwd
# Powinno pokazać: /var/www/Bukowski_app_API/Bukowski_app_API/backend/api
```

## 📂 Struktura plików do wgrania na serwer:

```
/var/www/Bukowski_app_API/Bukowski_app_API/backend/api/
├── migrate_add_row_colors.js    (plik migracji)
├── run_migration.sh             (skrypt bash)
└── app/
    ├── config.js
    └── db/models/goods.js
```

## 🚨 UWAGA:
- Rób backup bazy danych przed migracją!
- Migracja jest bezpieczna - tylko dodaje nowe pole
- Po migracji kolory będą zapisywane w bazie danych na stałe