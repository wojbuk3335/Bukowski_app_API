# Dokumentacja Kaskadowych Aktualizacji Użytkowników

## Wprowadzenie

System został rozszerzony o funkcjonalność kaskadowych aktualizacji, która automatycznie aktualizuje wszystkie referencje do użytkownika w całej bazie danych, gdy zmieni się jego `symbol` lub `sellingPoint`.

## Problem

Kiedy administrator zmienia `symbol` lub `sellingPoint` użytkownika, wszystkie istniejące referencje w innych kolekcjach (state, sales, history, transactionHistory, transfer) pozostają nieaktualne, co powoduje:
- Błędy w wyświetlaniu danych
- Problemy z filtrowaniem
- Niespójność danych
- Nieprawidłowe działanie funkcji transferu i historii

## Rozwiązanie

Zaimplementowano automatyczne kaskadowe aktualizacje, które przy zmianie danych użytkownika aktualizują wszystkie powiązane rekordy w następujących kolekcjach:

### Kolekcje i pola aktualizowane przy zmianie `symbol`:

1. **Sales** - pole `symbol`
2. **TransactionHistory** - pola:
   - `targetSymbol`
   - `processedItems.originalSymbol`

### Kolekcje i pola aktualizowane przy zmianie `sellingPoint`:

1. **Sales** - pole `sellingPoint`
2. **History** - pola:
   - `from`
   - `to`
3. **TransactionHistory** - pola:
   - `selectedSellingPoint`
   - `targetSellingPoint`
   - `processedItems.sellingPoint`
4. **Transfer** - pola:
   - `transfer_from`
   - `transfer_to`
5. **State** - używa ObjectId referencji, więc aktualizacja automatyczna

## API Endpoints

### 1. Aktualizacja Użytkownika (z kaskadowymi aktualizacjami)

**PUT** `/api/user/:userId`

**Headers:**
```
Content-Type: application/json
```

**Body (przykład zmiany symbolu):**
```json
{
  "symbol": "NowySymbol"
}
```

**Body (przykład zmiany sellingPoint):**
```json
{
  "sellingPoint": "NowyPunktSprzedaży"
}
```

**Odpowiedź:**
```json
{
  "message": "User updated",
  "cascadingUpdates": "References updated across collections",
  "request": {
    "type": "GET",
    "url": "http://localhost:3000/api/user/userId"
  }
}
```

### 2. Raport Referencji Użytkownika

**GET** `/api/user/:userId/references`

**Odpowiedź:**
```json
{
  "message": "User references report",
  "user": {
    "_id": "userId",
    "email": "user@example.com",
    "symbol": "UserSymbol",
    "sellingPoint": "UserSellingPoint",
    "role": "user"
  },
  "references": {
    "bySymbol": {
      "sales": 15,
      "transactionHistoryTargetSymbol": 3,
      "transactionHistoryProcessedItems": 12
    },
    "bySellingPoint": {
      "state": 25,
      "sales": 15,
      "historyFrom": 8,
      "historyTo": 7,
      "transactionHistorySelected": 104,
      "transactionHistoryTarget": 2,
      "transactionHistoryProcessedItems": 18,
      "transferFrom": 5,
      "transferTo": 3
    },
    "byUserId": {
      "history": 45,
      "transactionHistory": 120
    },
    "totals": {
      "symbolReferences": 30,
      "sellingPointReferences": 187,
      "userIdReferences": 165,
      "allReferences": 382
    }
  }
}
```

## Przykłady Użycia

### Przykład 1: Zmiana symbolu użytkownika

```bash
# PowerShell
$body = @{ symbol = "NowySymbol" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/user/userId" -Method PUT -Body $body -ContentType "application/json"
```

### Przykład 2: Zmiana punktu sprzedaży

```bash
# PowerShell
$body = @{ sellingPoint = "NowyPunkt" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/user/userId" -Method PUT -Body $body -ContentType "application/json"
```

### Przykład 3: Sprawdzenie referencji przed aktualizacją

```bash
# PowerShell
Invoke-RestMethod -Uri "http://localhost:3000/api/user/userId/references" -Method GET
```

## Logowanie

System loguje wszystkie operacje kaskadowych aktualizacji do konsoli serwera:

```
Updating symbol from "T" to "Ta" across collections
Updated 0 sales records with new symbol
Updated 0 transaction history records (targetSymbol)
Updated 0 transaction history processed items (originalSymbol)
All cascading updates completed successfully
```

```
Updating sellingPoint from "Tataa" to "Tatoos" across collections
Updated 0 sales records with new sellingPoint
Updated 0 history records (from field)
Updated 0 history records (to field)
Updated 104 transaction history records (selectedSellingPoint)
Updated 0 transaction history records (targetSellingPoint)
Updated 0 transaction history processed items (sellingPoint)
Updated 0 transfer records (transfer_from)
Updated 0 transfer records (transfer_to)
State collection uses ObjectId reference - no update needed
All cascading updates completed successfully
```

## Bezpieczeństwo

- Wszystkie operacje są atomowe w ramach pojedynczej kolekcji
- W przypadku błędu w jednej kolekcji, system kontynuuje aktualizację pozostałych
- Błędy są logowane do konsoli
- Historia zmian jest zachowywana w kolekcji History

## Testy

System został przetestowany z:
- ✅ Zmiana symbolu użytkownika
- ✅ Zmiana punktu sprzedaży użytkownika
- ✅ Raport referencji przed i po zmianach
- ✅ Logowanie operacji
- ✅ Obsługa błędów

## Zalecenia

1. **Zawsze sprawdź raport referencji** przed dokonaniem dużych zmian
2. **Monitoruj logi serwera** podczas aktualizacji
3. **Testuj na środowisku testowym** przed wdrożeniem
4. **Backup bazy danych** przed masowymi aktualizacjami

## Ograniczenia

- Aktualizacje nie są transakcyjne między kolekcjami (MongoDB nie wspiera multi-document transactions bez replica set)
- Bardzo duże aktualizacje mogą zająć więcej czasu
- W przypadku awarii w trakcie operacji, część kolekcji może pozostać nieaktualizowana
