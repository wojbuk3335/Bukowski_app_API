# 🎯 LIVE TESTING SCENARIOS - Wszystkie Kolory Produktów

## 📊 **SYSTEM KOLORÓW - DEFINICJE**

### 🟢 **ZIELONE PRODUKTY** (Green Products)
- **Typ operacji:** Operacja podwójna (synchronizacja)
- **Workflow:** Blue operation → Orange operation
- **Funkcjonalność:** Przetwarzanie sprzedaży + transfer z magazynu
- **CSS klasy:** `.synchronized-item`, `.salesMatched`
- **Kolor tła:** `#28a745` (zielony)

### 🟡 **ŻÓŁTE PRODUKTY** (Yellow Products) 
- **Typ operacji:** Incoming transfers (transfery przychodzące)
- **Workflow:** Transfer → State (dodanie do stanu użytkownika)
- **Funkcjonalność:** Przetwarzanie transferów przychodzących
- **CSS klasy:** `.incomingTransfer`
- **Kolor tła:** `#ffc107` (żółty)

### 🟠 **POMARAŃCZOWE PRODUKTY** (Orange Products)
- **Typ operacji:** Transfer z magazynu
- **Workflow:** Warehouse → User state
- **Funkcjonalność:** Przeniesienie z magazynu do punktu sprzedaży
- **CSS klasy:** `.magazynTransferred`, `.salesTransferred`
- **Kolor tła:** `#fd7e14` (pomarańczowy)

### 🔵 **NIEBIESKIE PRODUKTY** (Blue Products)
- **Typ operacji:** Sprzedaż i transfery niebieskie
- **Workflow:** State → History (usuń ze stanu)
- **Funkcjonalność:** Przetwarzanie sprzedaży, transfery, wymiany
- **CSS klasy:** `.salesDefault`, `.salesTransferred`
- **Kolor tła:** `#007bff` (niebieski)

---

## 🧪 **SCENARIUSZE TESTOWE**

### **SCENARIUSZ 1: Podstawowy Workflow Wszystkich Kolorów**

#### **Krok 1: Przygotowanie danych testowych**
```bash
# Test czy backend działa
curl -s "http://localhost:3000/api/users" | jq '.[0:3]'
curl -s "http://localhost:3000/api/state" | jq 'length'
curl -s "http://localhost:3000/api/state/warehouse" | jq 'length'
curl -s "http://localhost:3000/api/transfer" | jq 'length'
```

#### **Krok 2: Uruchom frontend**
```bash
cd /home/wojciech-bukowski/Programowanie/Bukowski/BukowskiAppAPI/Bukowski_app_API/frontend
npm start
```

#### **Krok 3: Test UI - Sprawdzenie kolorów**
1. **Otwórz:** `http://localhost:3001`
2. **Nawiguj do:** Admin Dashboard → Add To State
3. **Wybierz użytkownika:** dowolny punkt sprzedaży
4. **Sprawdź kolory elementów:**
   - 🟢 Zielone: synchronized items
   - 🟡 Żółte: incoming transfers  
   - 🟠 Pomarańczowe: magazyn transfers
   - 🔵 Niebieskie: sales items

---

### **SCENARIUSZ 2: Test Zielonych Produktów (Green - Operacja Podwójna)**

#### **Cel:** Przetestuj synchronizację sprzedaży + magazyn

**Kroki testowe:**
1. **Wybierz użytkownika** z listą produktów w stanie
2. **Znajdź elementy zielone** (jeśli istnieją)
3. **Kliknij "Process Green Products"**
4. **Sprawdź rezultat:**
   - Blue operation (sprzedaż) → wykonana
   - Orange operation (magazyn) → wykonana
   - Status: synchronized
   - Kolor: zielony `#28a745`

**Weryfikacja backend:**
```bash
curl -s "http://localhost:3000/api/history" | jq '.[] | select(.operation | contains("synchronized"))'
```

**Oczekiwany rezultat:**
- ✅ Elementy usunięte ze stanu
- ✅ Historie dla sprzedaży i magazynu
- ✅ Aktualizacja transaction report

---

### **SCENARIUSZ 3: Test Żółtych Produktów (Yellow - Incoming Transfers)**

#### **Cel:** Przetestuj transfery przychodzące

**Kroki testowe:**
1. **Sprawdź transfery oczekujące:**
   ```bash
   curl -s "http://localhost:3000/api/transfer" | jq '.[] | select(.processed == false)'
   ```

2. **W UI - wybierz użytkownika** który ma incoming transfers
3. **Znajdź żółte elementy** w tabeli transferów
4. **Kliknij "Process Yellow Products"**
5. **Sprawdź rezultat:**
   - Transfer → State migration
   - Status: processed
   - Kolor: żółty `#ffc107`

**Weryfikacja backend:**
```bash
# Sprawdź nowe elementy w stanie
curl -s "http://localhost:3000/api/state" | jq '.[] | select(.barcode | contains("generated"))'

# Sprawdź historie incoming transfers
curl -s "http://localhost:3000/api/history" | jq '.[] | select(.operation | contains("incoming"))'
```

**Oczekiwany rezultat:**
- ✅ Nowe elementy w stanie użytkownika
- ✅ Transfer oznaczony jako processed
- ✅ Historia incoming transfer

---

### **SCENARIUSZ 4: Test Pomarańczowych Produktów (Orange - Warehouse Transfer)**

#### **Cel:** Przetestuj transfer z magazynu

**Kroki testowe:**
1. **Sprawdź magazyn:**
   ```bash
   curl -s "http://localhost:3000/api/state/warehouse" | jq 'length'
   ```

2. **W UI - dodaj elementy z magazynu:**
   - Wybierz elementy z tabeli magazynu
   - Kliknij "Add to manual selection"
   - Elementy powinny być pomarańczowe

3. **Kliknij "Process Orange Products"**
4. **Sprawdź rezultat:**
   - Warehouse → User state
   - Status: transferred
   - Kolor: pomarańczowy `#fd7e14`

**Weryfikacja backend:**
```bash
# Sprawdź transfer z magazynu
curl -s "http://localhost:3000/api/history" | jq '.[] | select(.operation | contains("magazyn"))'
```

**Oczekiwany rezultat:**
- ✅ Elementy przeniesione z magazynu do użytkownika
- ✅ Historia warehouse transfer
- ✅ Aktualizacja stanów magazynu

---

### **SCENARIUSZ 5: Test Niebieskich Produktów (Blue - Sales & Transfers)**

#### **Cel:** Przetestuj operacje sprzedaży i transferów

**Kroki testowe:**
1. **Sprawdź sprzedaże:**
   ```bash
   curl -s "http://localhost:3000/api/sales/get-all-sales" | jq '.[] | select(.isFromSale == true)'
   ```

2. **W UI - znajdź niebieskie elementy:**
   - Sales items (sprzedaż)
   - Transfer items (transfery)
   - Exchange items (wymiany)

3. **Kliknij "Process Blue Products"**
4. **Sprawdź rezultat:**
   - State → History (removal)
   - Powody: SPRZEDAŻ, TRANSFER, EXCHANGE
   - Kolor: niebieski `#007bff`

**Weryfikacja backend:**
```bash
# Sprawdź usunięte ze sprzedaży
curl -s "http://localhost:3000/api/history" | jq '.[] | select(.operation | contains("SPRZEDAŻ"))'
```

**Oczekiwany rezultat:**
- ✅ Elementy usunięte ze stanu
- ✅ Historia sprzedaży/transferów
- ✅ Proper transaction tracking

---

### **SCENARIUSZ 6: Test Kompleksowy - Mixed Operations**

#### **Cel:** Przetestuj kombinację wszystkich kolorów

**Kroki testowe:**
1. **Przygotuj dane mieszane:**
   - Magazyn z produktami (pomarańczowe)
   - Sprzedaże (niebieskie)
   - Transfery incoming (żółte)
   - Items do synchronizacji (zielone)

2. **Wykonaj pełną operację:**
   - Wybierz użytkownika
   - Dodaj produkty z magazynu
   - Process mixed colors simultaneously
   - Sprawdź transaction report

3. **Weryfikuj kolejność operacji:**
   ```bash
   # Sprawdź ostatnią transakcję
   curl -s "http://localhost:3000/api/transfer/last-transaction" | jq '.'
   
   # Sprawdź historie według timestamp
   curl -s "http://localhost:3000/api/history" | jq 'sort_by(.timestamp) | .[-10:]'
   ```

**Oczekiwany rezultat:**
- ✅ Wszystkie kolory przetworzono poprawnie
- ✅ Proper operation sequence
- ✅ Complete transaction logging
- ✅ Correct state management

---

### **SCENARIUSZ 7: Test Undo Operations**

#### **Cel:** Przetestuj cofanie operacji dla wszystkich kolorów

**Kroki testowe:**
1. **Wykonaj operacje wszystkich kolorów**
2. **Kliknij "Undo Last Transaction"**
3. **Sprawdź przywrócenie:**
   - Zielone: restore both sales and warehouse
   - Żółte: remove from state, restore transfer
   - Pomarańczowe: restore to warehouse
   - Niebieskie: restore to original state

**Weryfikacja:**
```bash
# Sprawdź cofnięte operacje
curl -s "http://localhost:3000/api/history" | jq '.[] | select(.operation | contains("UNDO"))'

# Sprawdź aktualny stan
curl -s "http://localhost:3000/api/state" | jq 'length'
```

---

### **SCENARIUSZ 8: Performance & Race Conditions**

#### **Cel:** Test wydajności i konfliktów współbieżnych

**Kroki testowe:**
1. **Symuluj concurrent operations:**
   ```bash
   # Uruchom równolegle
   curl -X POST "http://localhost:3000/api/transfer/process-sales" &
   curl -X POST "http://localhost:3000/api/transfer/process-warehouse" &
   curl -X POST "http://localhost:3000/api/transfer/process-all" &
   wait
   ```

2. **Test load performance:**
   - Dodaj 50+ elementów
   - Process wszystkie kolory
   - Sprawdź czas response

3. **Weryfikuj data integrity:**
   ```bash
   # Sprawdź consistency
   curl -s "http://localhost:3000/api/state" | jq 'group_by(.barcode) | map(select(length > 1))'
   ```

---

### **SCENARIUSZ 9: Error Handling & Edge Cases**

#### **Cel:** Test obsługi błędów

**Test cases:**
1. **Missing data scenarios:**
   - Brak użytkowników
   - Pusty magazyn
   - Brak transferów

2. **Invalid operations:**
   - Duplikaty barcode
   - Missing sizes/colors
   - Invalid symbols

3. **Network errors:**
   - API timeout
   - 500 errors
   - Disconnect scenarios

---

### **SCENARIUSZ 10: Mobile App Integration**

#### **Cel:** Test QR scanner z kolorami

**Kroki testowe:**
1. **Uruchom mobile app:**
   ```bash
   cd /home/wojciech-bukowski/Programowanie/Bukowski/MobileApp/BukowskiReactNativeBuild
   npx expo start
   ```

2. **Scan barcodes** które reprezentują różne kolory
3. **Sprawdź mapping:** barcode → color → operation type
4. **Weryfikuj integration** z backend API

---

## 📈 **METRYKI SUKCESU**

### **Dla każdego scenariusza sprawdź:**
- ✅ **UI Correctness:** Proper colors displayed
- ✅ **Backend Processing:** Correct API calls
- ✅ **Data Integrity:** No data loss/corruption
- ✅ **Performance:** Response times < 2s
- ✅ **Error Handling:** Graceful error recovery
- ✅ **Transaction Logging:** Complete audit trail

### **Critical Success Factors:**
1. **Color Coding:** Każdy typ operacji ma właściwy kolor
2. **Data Flow:** Proper state transitions
3. **History Tracking:** Complete audit trail
4. **Undo Capability:** Reliable rollback
5. **Performance:** System scales with data volume

---

## 🚀 **INSTRUKCJE URUCHOMIENIA**

### **Terminal 1 - Backend:**
```bash
cd /home/wojciech-bukowski/Programowanie/Bukowski/BukowskiAppAPI/Bukowski_app_API/backend/api
npm start
```

### **Terminal 2 - Frontend:**
```bash
cd /home/wojciech-bukowski/Programowanie/Bukowski/BukowskiAppAPI/Bukowski_app_API/frontend  
npm start
```

### **Terminal 3 - Testing Commands:**
```bash
cd /home/wojciech-bukowski/Programowanie/Bukowski/BukowskiAppAPI/Bukowski_app_API
# Use curl commands from scenarios above
```

### **Browser:**
- **Frontend:** `http://localhost:3001`
- **API Test:** `http://localhost:3000/api/users`

---

## 📝 **NOTATKI TESTOWE**

**Użyj tego szablonu do dokumentowania rezultatów:**

```
SCENARIUSZ: [numer]
DATA: [31.08.2025]
CZAS WYKONANIA: [start-end]

REZULTATY:
🟢 Zielone: [status/czas/błędy]
🟡 Żółte: [status/czas/błędy]  
🟠 Pomarańczowe: [status/czas/błędy]
🔵 Niebieskie: [status/czas/błędy]

PROBLEMY ZNALEZIONE:
- [lista problemów]

POPRAWKI POTRZEBNE:
- [lista poprawek]

OGÓLNA OCENA: ✅/❌
```

**Happy Testing! 🎯**
