/**
 * Test: Problem z znikającymi sprzedażami po usunięciu bazy states
 */

describe('Sales visibility after states deletion', () => {
    test('Sprzedaże powinny być widoczne nawet po usunięciu bazy states', () => {
        console.log('🔍 Testujemy problem: po usunięciu bazy states, sprzedaże znikają z listy');
        
        // Symulujemy sales z polem processed: false
        const salesWithProcessed = [
            { _id: '1', barcode: '001', from: 'P', processed: false },
            { _id: '2', barcode: '002', from: 'P', processed: true },
            { _id: '3', barcode: '003', from: 'P', processed: false }
        ];
        
        // Symulujemy puste allStates (baza została usunięta)
        const allStates = [];
        const processedSales = new Set(); // Brak lokalnie przetworzonych
        
        console.log('📋 Dane testowe:');
        console.log(`   - Sales z processed=false: ${salesWithProcessed.filter(s => !s.processed).length}`);
        console.log(`   - Sales z processed=true: ${salesWithProcessed.filter(s => s.processed).length}`);
        console.log(`   - allStates.length: ${allStates.length} (baza usunięta)`);
        
        // Symulujemy NOWĄ logikę (po poprawce)
        const visibleSalesNew = salesWithProcessed.filter(sale => {
            const isLocallyProcessed = processedSales.has(sale._id);
            
            let isProcessed = isLocallyProcessed;
            
            if (sale.hasOwnProperty('processed')) {
                // NOWA LOGIKA: Użyj pola processed
                isProcessed = isLocallyProcessed || sale.processed;
            } else {
                // STARA LOGIKA: Sprawdź states (fallback)
                const itemExistsInState = allStates.some(stateItem => 
                    stateItem.barcode === sale.barcode && stateItem.symbol === sale.from
                );
                isProcessed = isLocallyProcessed || !itemExistsInState;
            }
            
            return !isProcessed;
        });
        
        // Symulujemy STARĄ logikę (przed poprawką)
        const visibleSalesOld = salesWithProcessed.filter(sale => {
            const isLocallyProcessed = processedSales.has(sale._id);
            
            // STARA LOGIKA: Zawsze sprawdzaj states
            const itemExistsInState = allStates.some(stateItem => 
                stateItem.barcode === sale.barcode && stateItem.symbol === sale.from
            );
            const isProcessed = isLocallyProcessed || !itemExistsInState;
            
            return !isProcessed;
        });
        
        console.log('📊 Wyniki:');
        console.log(`   - NOWA logika: ${visibleSalesNew.length} widocznych sales`);
        console.log(`   - STARA logika: ${visibleSalesOld.length} widocznych sales`);
        
        // Po poprawce: powinny być widoczne 2 sales z processed=false
        expect(visibleSalesNew.length).toBe(2);
        expect(visibleSalesNew.map(s => s._id)).toEqual(['1', '3']);
        
        // Przed poprawką: 0 sales (wszystkie uznane za przetworzone bo brak w states)
        expect(visibleSalesOld.length).toBe(0);
        
        console.log('✅ POPRAWKA: Sales z processed=false są widoczne nawet bez states');
        console.log('❌ PRZED: Wszystkie sales znikały po usunięciu bazy states');
    });
    
    test('Legacy sales bez pola processed nadal używają sprawdzania states', () => {
        console.log('🔍 Testujemy fallback dla starych sales bez pola processed');
        
        // Symulujemy stare sales BEZ pola processed
        const legacySales = [
            { _id: '4', barcode: '004', from: 'P' }, // Brak pola processed
            { _id: '5', barcode: '005', from: 'P' }  // Brak pola processed
        ];
        
        // Symulujemy states z jednym elementem
        const allStates = [
            { barcode: '004', symbol: 'P' } // Tylko barcode 004 istnieje w stanie
        ];
        const processedSales = new Set();
        
        const visibleSales = legacySales.filter(sale => {
            const isLocallyProcessed = processedSales.has(sale._id);
            
            let isProcessed = isLocallyProcessed;
            
            if (sale.hasOwnProperty('processed')) {
                isProcessed = isLocallyProcessed || sale.processed;
            } else {
                // FALLBACK: Sprawdź states dla starych sales
                const itemExistsInState = allStates.some(stateItem => 
                    stateItem.barcode === sale.barcode && stateItem.symbol === sale.from
                );
                isProcessed = isLocallyProcessed || !itemExistsInState;
            }
            
            return !isProcessed;
        });
        
        // Tylko barcode 004 powinien być widoczny (istnieje w states)
        expect(visibleSales.length).toBe(1);
        expect(visibleSales[0]._id).toBe('4');
        
        console.log('✅ Fallback działa: stare sales używają sprawdzania states');
    });
});
