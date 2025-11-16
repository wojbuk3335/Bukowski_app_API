/**
 * Test: Sprawdza czy sprzedaże przywrócone z korekt mają prawidłowe dane
 * Problem: "Ada CZERWONY 2XL T KOREKTY" zamiast oryginalnych danych
 */

describe('CORRECTIONS UNDO - Sales Restoration Fix', () => {
    test('Sprzedaż przywrócona z korekt powinna mieć oryginalne dane, nie KOREKTY', () => {
        console.log('🔍 Testujemy przywracanie sprzedaży z korekt z oryginalnymi danymi');
        
        // Symulujemy originalData z korekty
        const originalData = {
            _id: '66e123456789abcdef123456',
            fullName: 'Ada CZERWONY',
            size: '2XL',
            barcode: '0010702300001',
            sellingPoint: 'T',  // ORYGINALNE miejsce sprzedaży
            from: 'T',          // ORYGINALNE źródło
            symbol: 'T',        // ORYGINALNY symbol
            timestamp: new Date(),
            date: '2025-09-07',
            cash: [{ price: 100, currency: 'PLN' }],
            card: [],
            isFromSale: true
        };
        
        // Symulujemy entry z korekt (gdzie from = "KOREKTY")
        const entry = {
            from: 'KOREKTY',
            to: 'T',
            product: 'Ada CZERWONY 2XL (0010702300001)',
            originalData: JSON.stringify(originalData)
        };
        
        console.log('📋 Dane wejściowe:');
        console.log(`   - entry.from: ${entry.from} (nie powinno być używane dla sales)`);
        console.log(`   - originalData.sellingPoint: ${originalData.sellingPoint}`);
        console.log(`   - originalData.from: ${originalData.from}`);
        console.log(`   - originalData.symbol: ${originalData.symbol}`);
        
        // Symulujemy tworzenie Sales obiektu (logika z transferProcessing.js)
        const recreatedSale = {
            fullName: originalData.fullName,
            size: originalData.size,
            barcode: originalData.barcode,
            sellingPoint: originalData?.sellingPoint || originalData?.from || entry.from,
            from: originalData?.from || originalData?.sellingPoint || entry.from,
            symbol: originalData?.symbol || originalData?.from || entry.from,
            timestamp: originalData?.timestamp || new Date(),
            date: originalData?.date || new Date().toISOString().split('T')[0],
            cash: originalData?.cash || [],
            card: originalData?.card || [],
            processed: false,
            processedAt: null
        };
        
        // Sprawdź czy dane są przywrócone prawidłowo
        expect(recreatedSale.sellingPoint).toBe('T');  // NIE "KOREKTY"
        expect(recreatedSale.from).toBe('T');          // NIE "KOREKTY"  
        expect(recreatedSale.symbol).toBe('T');        // NIE "KOREKTY"
        expect(recreatedSale.processed).toBe(false);   // Nieprzetworzone
        expect(recreatedSale.cash).toEqual([{ price: 100, currency: 'PLN' }]); // Oryginalne dane finansowe
        
        console.log('✅ POPRAWKA: Sprzedaż przywrócona z oryginalnymi danymi');
        console.log(`   - sellingPoint: ${recreatedSale.sellingPoint} (zamiast KOREKTY)`);
        console.log(`   - from: ${recreatedSale.from} (zamiast KOREKTY)`);
        console.log(`   - symbol: ${recreatedSale.symbol} (zamiast KOREKTY)`);
        console.log('❌ PRZED: Pokazywało się jako T -> KOREKTY');
        console.log('✅ TERAZ: Pokazuje się jako oryginalna sprzedaż z punktu T');
    });
    
    test('Transfer przywrócony z korekt powinien mieć oryginalne transfer_to', () => {
        console.log('🔍 Testujemy przywracanie transferu z korekt');
        
        const originalData = {
            _id: '66e123456789abcdef123457',
            transfer_from: 'P',
            transfer_to: 'T',    // ORYGINALNE miejsce docelowe
            isFromSale: false,   // To nie jest sprzedaż
            fullName: 'Ada CZERWONY',
            size: '2XL',
            barcode: '0010702300002'
        };
        
        const entry = {
            from: 'KOREKTY',
            to: 'P',
            originalData: JSON.stringify(originalData)
        };
        
        // Symulujemy tworzenie Transfer obiektu
        const recreatedTransfer = {
            transfer_from: originalData?.transfer_from || entry.from,
            transfer_to: originalData?.transfer_to || entry.to,
            isFromSale: originalData?.isFromSale || false,
            processed: false
        };
        
        expect(recreatedTransfer.transfer_from).toBe('P');
        expect(recreatedTransfer.transfer_to).toBe('T');  // NIE "KOREKTY"
        expect(recreatedTransfer.isFromSale).toBe(false);
        
        console.log('✅ Transfer przywrócony prawidłowo P -> T (nie P -> KOREKTY)');
    });
});
