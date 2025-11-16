# 🖨️ Instrukcja drukowania etykiet ZPL na drukarce Zebra

## 📋 Przegląd funkcjonalności

W komponencie AddToState dodano funkcjonalność drukowania etykiet na drukarce Zebra używając języka ZPL (Zebra Programming Language).

## ✨ Nowe funkcje

### 1. Drukowanie wszystkich etykiet pomarańczowych i żółtych
- **Przycisk**: "🖨️ Drukuj etykiety pomarańczowych i żółtych (X)"
- **Funkcja**: Drukuje etykiety dla wszystkich produktów z magazynu (pomarańczowe) i przychodzące transfery (żółte)
- **Lokalizacja**: Główny panel, obok przycisku "Zapisz"

### 2. Drukowanie pojedynczych etykiet  
- **Przycisk**: "🖨️" obok każdego produktu pomarańczowego/żółtego
- **Funkcja**: Drukuje etykietę dla konkretnego produktu

### 3. Konfiguracja drukarki
- **Przycisk**: "⚙️ Konfiguruj drukarkę (IP)"
- **Funkcja**: Pozwala zmienić adres IP drukarki i testować połączenie

## 🔧 Konfiguracja drukarki Zebra

### Wymagania wstępne
1. **Drukarka Zebra** podłączona do tej samej sieci co serwer
2. **Port 9100** otwarty (domyślny port Zebra)
3. **Adres IP** drukarki (sprawdź w ustawieniach sieciowych drukarki)

### Kroki konfiguracji
1. Kliknij przycisk "⚙️ Konfiguruj drukarkę"
2. Wprowadź poprawny adres IP drukarki (np. `192.168.1.100`)
3. Kliknij "🧪 Test drukarki" aby sprawdzić połączenie
4. Jeśli test przejdzie pomyślnie, kliknij "✅ Zapisz i zamknij"

### Znajdowanie IP drukarki
- **Menu drukarki**: Settings → Network → TCP/IP → IP Address
- **Wydruk konfiguracji**: Przytrzymaj przycisk feed podczas włączania
- **Panel administratora**: Sprawdź w routerze/switchu sieciowym

## 📄 Format etykiety ZPL

Każda etykieta zawiera:
- **Nazwa produktu** (skrócona do 20 znaków)
- **Rozmiar**
- **Transfer Z/DO** (lokalizacje)
- **Data drukowania**
- **Kod kreskowy** (barcode produktu)

### Wymiary etykiety
- **Szerokość**: 50mm
- **Wysokość**: 30mm
- **Format**: ZPL (Zebra Programming Language)

## 🚨 Rozwiązywanie problemów

### Błędy połączenia
**Objawy**: "Connection timeout" lub "Connection refused"
**Rozwiązania**:
1. Sprawdź czy drukarka jest włączona
2. Zweryfikuj adres IP drukarki  
3. Upewnij się, że drukarka jest w tej samej sieci
4. Sprawdź czy port 9100 nie jest blokowany przez firewall

### Błędy drukowania
**Objawy**: Etykiety nie drukują się pomimo sukcesu połączenia
**Rozwiązania**:
1. Sprawdź czy w drukarce jest papier
2. Zweryfikuj ustawienia rozmiaru etykiety w drukarce
3. Sprawdź czy drukarka obsługuje format ZPL

### Niepoprawny format etykiet
**Objawy**: Etykiety drukują się, ale są zniekształcone
**Rozwiązania**:
1. Skalibruj drukarkę (funkcja Auto-Calibration)
2. Sprawdź ustawienia DPI drukarki
3. Dostosuj wymiary w kodzie ZPL jeśli używasz innego formatu etykiet

## 🔍 Testowanie

### Test połączenia
1. Użyj przycisku "🧪 Test drukarki" w konfiguracji
2. Sprawdź czy wydrukowana zostanie etykieta testowa z napisem "TEST ETYKIETY"

### Test drukowania pojedynczej etykiety
1. Wybierz datę i użytkownika w głównym panelu
2. Kliknij "🖨️" obok dowolnego produktu pomarańczowego/żółtego
3. Potwierdź drukowanie w oknie dialogowym

## 📁 Struktura kodu

### Frontend (AddToState.js)
- `generateZPLCode()` - Generuje kod ZPL dla etykiety
- `sendZPLToPrinter()` - Wysyła ZPL do backendu
- `handlePrintAllColoredLabels()` - Drukuje wszystkie etykiety
- `handlePrintSingleLabel()` - Drukuje pojedynczą etykietę

### Backend (print.js)
- **Route**: `POST /api/print-label`
- **Controller**: `printController.printLabel()`
- **Port**: 9100 (TCP/IP połączenie z drukarką)

## ⚙️ Parametry konfiguracyjne

### Domyślne ustawienia
```javascript
const DEFAULT_PRINTER_IP = '192.168.1.100';
const DEFAULT_PRINTER_PORT = 9100;
const LABEL_WIDTH = 50; // mm
const LABEL_HEIGHT = 30; // mm
```

### Zmiana domyślnych ustawień
Adres IP można zmienić w interfejsie użytkownika lub bezpośrednio w kodzie:
```javascript
const [printerIP, setPrinterIP] = useState('YOUR_PRINTER_IP');
```

## 📞 Wsparcie techniczne

### Logi do debugowania
Wszystkie operacje drukowania są logowane w konsoli przeglądarki i konsoli serwera.

**Frontend Console**:
```
🖨️ Drukowanie etykiet dla: X produktów
Drukowanie etykiety 1/X: Nazwa produktu (🟠 Pomarańczowy)
```

**Backend Console**:
```
🖨️ Wysyłanie etykiety ZPL do drukarki 192.168.1.100:9100
📦 Produkt: Nazwa produktu
✅ Połączono z drukarką 192.168.1.100:9100
```

### Kontakt
W przypadku problemów technicznych sprawdź logi i skontaktuj się z administratorem systemu.