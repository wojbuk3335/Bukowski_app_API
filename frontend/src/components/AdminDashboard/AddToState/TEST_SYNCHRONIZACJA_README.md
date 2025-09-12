# Test Synchronizacji AddToState

## 📋 Opis
Prosty test automatyczny dla mechanizmu synchronizacji w komponencie `AddToState`. Test sprawdza czy synchronizacja produktów między transferami a magazynem działa prawidłowo.

## 🧪 Testy Zawarte

1. **Synchronizacja powinna działać i sparować produkty**
   - Sprawdza czy przycisk synchronizacji działa bez błędów
   - Weryfikuje podstawowe działanie mechanizmu

2. **Komponent powinien załadować dane z API** 
   - Test ładowania danych z backend API
   - Sprawdza czy mock dane są poprawnie pobierane

3. **Przycisk synchronizacji powinien być aktywny**
   - Weryfikuje dostępność przycisku synchronizacji
   - Sprawdza stan aktywności elementu UI

4. **Reset synchronizacji powinien być dostępny**
   - Test obecności i dostępności przycisku reset
   - Sprawdza funkcjonalność resetowania

5. **Dane testowe powinny zawierać matching produkty**
   - Walidacja poprawności danych testowych
   - Sprawdza czy produkty mogą być sparowane (ta sama nazwa i rozmiar)

6. **Synchronizacja powinna działać bez błędów w konsoli**
   - Test wykonania synchronizacji bez błędów JavaScript
   - Weryfikuje brak problemów w konsoli podczas wykonania

## 📊 Dane Testowe

### Transfer Product:
```javascript
{
  _id: 'transfer1',
  fullName: 'Ada CZERWONY',
  size: '2XL',
  barcode: '68c3ac895611941551b7edca',
  symbol: 'K'
}
```

### Warehouse Product (matching):
```javascript
{
  _id: 'warehouse1',
  fullName: { fullName: 'Ada CZERWONY' },
  size: { Roz_Opis: '2XL' },
  barcode: '0010702300001',
  price: 100,
  symbol: 'MAGAZYN'
}
```

## ▶️ Jak uruchomić

```bash
cd frontend
npm test -- --testPathPattern=AddToState.synchronization.simple.test.js --watchAll=false
```

## ✅ Wynik
Wszystkie 6 testów przechodzą pomyślnie, potwierdzając że:
- Synchronizacja działa prawidłowo
- Komponenty renderują się bez problemów
- API mocking działa poprawnie
- Brak błędów JavaScript podczas wykonania

## 🔧 Konfiguracja
Test wykorzystuje:
- **Jest** - framework testowy
- **React Testing Library** - do testowania komponentów React
- **Mock API** - symulacja wywołań backend
- **Act/WaitFor** - do obsługi asynchronicznych operacji

## 📝 Uwagi
Test jest zoptymalizowany pod kątem:
- Szybkość wykonania (< 3 sekundy)
- Stabilność (nie polegają na timing)
- Prostota (jasne komunikaty o statusie)
- Niezawodność (mock data zagwarantowane)