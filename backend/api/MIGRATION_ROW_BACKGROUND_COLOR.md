# Migracja: Dodawanie pola rowBackgroundColor

## Opis
Ta migracja dodaje pole `rowBackgroundColor` do wszystkich produktów w bazie danych. Pole to przechowuje kolor tła wybrany przez użytkownika w tabeli wyszukiwarki produktów.

## Data utworzenia
22 października 2025

## Cel migracji
- Dodanie pola `rowBackgroundColor` do wszystkich dokumentów w kolekcji `goods`
- Ustawienie domyślnej wartości `#ffffff` (biały kolor) dla wszystkich istniejących produktów
- Przygotowanie bazy danych do obsługi kolorów tła w tabeli produktów

## Struktura pola
```javascript
{
  rowBackgroundColor: String  // Hex color kod (np. "#ff0000", "#00ff00", "#ffffff")
}
```

## Pliki migracji
1. `migrate_add_row_background_color.js` - główny skrypt migracji
2. `run_migration_row_background_color.sh` - skrypt bash do uruchamiania
3. `run_migration_row_background_color.ps1` - skrypt PowerShell do uruchamiania

## Sposób uruchomienia

### Na serwerze Linux/Unix:
```bash
cd /path/to/backend/api
chmod +x run_migration_row_background_color.sh
./run_migration_row_background_color.sh
```

### Na Windows (PowerShell):
```powershell
cd C:\path\to\backend\api
.\run_migration_row_background_color.ps1
```

### Bezpośrednio przez Node.js:
```bash
cd /path/to/backend/api
node migrate_add_row_background_color.js
```

## Zmienne środowiskowe
Migracja używa następujących zmiennych środowiskowych:
- `MONGODB_URI` - URL połączenia z MongoDB (domyślnie: `mongodb://localhost:27017`)
- `DB_NAME` - nazwa bazy danych (domyślnie: `bukowski_inventory`)

## Co robi migracja
1. **Łączy się z bazą danych** MongoDB
2. **Sprawdza** ile produktów nie ma pola `rowBackgroundColor`
3. **Dodaje pole** `rowBackgroundColor` z wartością `#ffffff` do wszystkich produktów, które go nie mają
4. **Wyświetla statystyki** operacji
5. **Weryfikuje** czy wszystkie produkty zostały zaktualizowane

## Bezpieczeństwo
- Migracja dodaje tylko nowe pole, nie modyfikuje istniejących danych
- Używa operacji `updateMany` z filtrem `{ rowBackgroundColor: { $exists: false } }`
- Nie usuwa ani nie zmienia istniejących pól
- Można uruchomić wielokrotnie bez negatywnych skutków

## Przykładowy output
```
🚀 Rozpoczynanie migracji: Dodawanie pola rowBackgroundColor
📅 Data: 22.10.2025, 14:30:15
🗃️  Baza danych: bukowski_inventory
🔗 URI: mongodb://***:***@localhost:27017

🔄 Łączenie z bazą danych...
📊 Sprawdzanie produktów bez pola rowBackgroundColor...
📈 Znaleziono 1250 produktów bez pola rowBackgroundColor
🔄 Dodawanie pola rowBackgroundColor do wszystkich produktów...
✅ Pomyślnie zaktualizowano 1250 produktów
📝 Wszystkie produkty mają teraz pole rowBackgroundColor z domyślną wartością '#ffffff'

📊 Podsumowanie:
   - Łączna liczba produktów: 1250
   - Produkty z polem rowBackgroundColor: 1250
   - Procent zaktualizowanych: 100.0%

🎉 Migracja zakończona pomyślnie! Wszystkie produkty mają pole rowBackgroundColor.
🔌 Połączenie z bazą danych zamknięte

✅ Migracja zakończona pomyślnie!
```

## Rollback
Jeśli zachodzi potrzeba cofnięcia migracji (usunięcia pola `rowBackgroundColor`):

```javascript
// Skrypt rollback (NIE URUCHAMIAĆ bez wyraźnej potrzeby)
db.goods.updateMany(
  { rowBackgroundColor: { $exists: true } },
  { $unset: { rowBackgroundColor: "" } }
);
```

## Testy po migracji
Po uruchomieniu migracji sprawdź:
1. Czy wszystkie produkty mają pole `rowBackgroundColor`
2. Czy aplikacja frontend działa poprawnie z kolorami
3. Czy można zapisywać i odczytywać kolory z tabeli
4. Czy drukowanie zachowuje kolory

## Związane pliki frontend
- `SeachEngineTable.js` - komponenet wykorzystujący pole `rowBackgroundColor`
- Endpoint `/api/goods/row-colors` - do aktualizacji kolorów

## Notatki
- Migracja jest idempotentna (można uruchomić wielokrotnie)
- Dodawane pole ma domyślną wartość `#ffffff` (biały)
- Pole jest typu String i przechowuje kody kolorów w formacie hex