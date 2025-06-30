# Test Case: Kaskadowe Aktualizacje Użytkowników

## Test Scenario 1: Zmiana symbolu użytkownika

### Przed testem:
```powershell
# 1. Sprawdź obecne dane użytkownika
Invoke-RestMethod -Uri "http://localhost:3000/api/user/68079c83bcf41226bb694a3c" -Method GET

# 2. Sprawdź referencje przed zmianą
Invoke-RestMethod -Uri "http://localhost:3000/api/user/68079c83bcf41226bb694a3c/references" -Method GET
```

### Wykonanie testu:
```powershell
# 3. Zmień symbol z obecnego na nowy
$body = @{ symbol = "TEST_SYMBOL" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/user/68079c83bcf41226bb694a3c" -Method PUT -Body $body -ContentType "application/json"
```

### Weryfikacja:
```powershell
# 4. Sprawdź zaktualizowane dane użytkownika
Invoke-RestMethod -Uri "http://localhost:3000/api/user/68079c83bcf41226bb694a3c" -Method GET

# 5. Sprawdź referencje po zmianie
Invoke-RestMethod -Uri "http://localhost:3000/api/user/68079c83bcf41226bb694a3c/references" -Method GET

# 6. Sprawdź w sales, czy symbol został zaktualizowany (jeśli były rekordy)
Invoke-RestMethod -Uri "http://localhost:3000/api/sales/get-all-sales" -Method GET | Where-Object { $_.symbol -eq "TEST_SYMBOL" }
```

### Oczekiwane rezultaty:
- ✅ Symbol użytkownika zmieniony na "TEST_SYMBOL"
- ✅ Wszystkie referencje w sales zaktualizowane
- ✅ Wszystkie referencje w transactionHistory zaktualizowane
- ✅ Logi pokazują liczbę zaktualizowanych rekordów

---

## Test Scenario 2: Zmiana punktu sprzedaży

### Przed testem:
```powershell
# 1. Sprawdź obecne dane użytkownika
Invoke-RestMethod -Uri "http://localhost:3000/api/user/6808ab28147fef1860200b8d" -Method GET

# 2. Sprawdź referencje przed zmianą
Invoke-RestMethod -Uri "http://localhost:3000/api/user/6808ab28147fef1860200b8d/references" -Method GET
```

### Wykonanie testu:
```powershell
# 3. Zmień sellingPoint
$body = @{ sellingPoint = "TEST_SELLING_POINT" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/user/6808ab28147fef1860200b8d" -Method PUT -Body $body -ContentType "application/json"
```

### Weryfikacja:
```powershell
# 4. Sprawdź zaktualizowane dane użytkownika
Invoke-RestMethod -Uri "http://localhost:3000/api/user/6808ab28147fef1860200b8d" -Method GET

# 5. Sprawdź referencje po zmianie
Invoke-RestMethod -Uri "http://localhost:3000/api/user/6808ab28147fef1860200b8d/references" -Method GET

# 6. Sprawdź state - produkty powinny nadal być przypisane do użytkownika (ObjectId)
Invoke-RestMethod -Uri "http://localhost:3000/api/state" -Method GET | Where-Object { $_.symbol -eq "TEST_SELLING_POINT" }
```

### Oczekiwane rezultaty:
- ✅ SellingPoint użytkownika zmieniony na "TEST_SELLING_POINT"
- ✅ Wszystkie referencje w sales zaktualizowane
- ✅ Wszystkie referencje w history zaktualizowane
- ✅ Wszystkie referencje w transactionHistory zaktualizowane
- ✅ Wszystkie referencje w transfer zaktualizowane
- ✅ State automatycznie pokazuje nowy symbol (przez ObjectId reference)

---

## Test Scenario 3: Równoczesna zmiana symbolu i sellingPoint

### Wykonanie:
```powershell
$body = @{ 
    symbol = "COMPLETE_TEST"
    sellingPoint = "COMPLETE_TEST_POINT" 
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/user/6825f2335a01218d8e14d27f" -Method PUT -Body $body -ContentType "application/json"
```

### Oczekiwane rezultaty:
- ✅ Oba pola zaktualizowane
- ✅ Kaskadowe aktualizacje dla obu zmian
- ✅ Wszystkie kolekcje zawierają nowe wartości

---

## Test Scenario 4: Raport referencji dla użytkownika z dużą ilością danych

### Wykonanie:
```powershell
# Sprawdź użytkownika MAGAZYN (prawdopodobnie ma najwięcej referencji)
Invoke-RestMethod -Uri "http://localhost:3000/api/user/6825d5a55a01218d8e14cf43/references" -Method GET
```

### Oczekiwane rezultaty:
- ✅ Szczegółowy raport z liczbami referencji
- ✅ Suma wszystkich referencji
- ✅ Podział na kategorie (symbol, sellingPoint, userId)

---

## Rollback Test (Przywrócenie oryginalnych wartości)

Po testach, przywróć oryginalne wartości:

```powershell
# Przywróć użytkownika 1
$body = @{ symbol = "Ta"; sellingPoint = "Tatoos" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/user/68079c83bcf41226bb694a3c" -Method PUT -Body $body -ContentType "application/json"

# Przywróć użytkownika 2
$body = @{ symbol = "M"; sellingPoint = "Most" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/user/6808ab28147fef1860200b8d" -Method PUT -Body $body -ContentType "application/json"

# Przywróć użytkownika 3
$body = @{ symbol = "S"; sellingPoint = "Skzat" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/user/6825f2335a01218d8e14d27f" -Method PUT -Body $body -ContentType "application/json"
```

---

## Monitoring w czasie rzeczywistym

W trakcie testów monitoruj logi serwera:
```bash
# W terminalu z backendem obserwuj output z aktualizacjami
```

Przykładowe logi:
```
Updating symbol from "S" to "COMPLETE_TEST" across collections
Updated 0 sales records with new symbol
Updated 0 transaction history records (targetSymbol)
Updated 0 transaction history processed items (originalSymbol)
Updating sellingPoint from "Skzat" to "COMPLETE_TEST_POINT" across collections
Updated 2 sales records with new sellingPoint
Updated 5 history records (from field)
Updated 3 history records (to field)
Updated 15 transaction history records (selectedSellingPoint)
Updated 0 transaction history records (targetSellingPoint)
Updated 8 transaction history processed items (sellingPoint)
Updated 0 transfer records (transfer_from)
Updated 0 transfer records (transfer_to)
State collection uses ObjectId reference - no update needed
All cascading updates completed successfully
```
