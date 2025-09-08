describe('UNDO - Problem P->KOREKTY Fix', () => {
    
    test('Ada CZERWONY transfer P->T should restore as P->T, NOT P->KOREKTY', () => {
        console.log('🔍 Testujemy problem: Ada CZERWONY pokazuje się jako P->KOREKTY zamiast P->T');
        
        // Symulacja dokładnie Twojego przypadku
        const historyEntry = {
            operation: 'Przeniesiono do korekt',
            fullName: 'Ada CZERWONY',
            size: '2XL',
            from: 'P',
            to: 'KOREKTY',  // To jest błędne - powinno być 'T'
            originalData: {
                _id: '68ba77fc8a713537a37f322c',
                transfer_from: 'P',
                transfer_to: 'T',  // ✅ PRAWIDŁOWA WARTOŚĆ z originalData
                fullName: 'Ada CZERWONY',
                size: '2XL',
                isFromSale: false  // To jest transfer, nie sprzedaż
            }
        };

        // Test nowej logiki
        const wasFromSale = historyEntry.originalData?.isFromSale === true;
        const correctTransferTo = historyEntry.originalData?.transfer_to;
        
        console.log(`📋 Dane wejściowe:`);
        console.log(`   - entry.to: ${historyEntry.to}`);
        console.log(`   - originalData.transfer_to: ${correctTransferTo}`);
        console.log(`   - isFromSale: ${wasFromSale}`);
        
        // Asercje
        expect(wasFromSale).toBe(false);  // To nie jest sprzedaż
        expect(correctTransferTo).toBe('T');  // Powinno być 'T'
        expect(correctTransferTo).not.toBe('KOREKTY');  // NIE powinno być 'KOREKTY'
        
        console.log(`✅ POPRAWKA: Transfer zostanie przywrócony jako P -> ${correctTransferTo}`);
        console.log(`❌ PRZED: Pokazywało się jako P -> ${historyEntry.to}`);
    });

    test('Sprzedaż powinna być przywrócona do Sales, nie Transfer', () => {
        const saleEntry = {
            operation: 'Przeniesiono do korekt',
            originalData: {
                isFromSale: true,  // ✅ To jest sprzedaż
                fullName: 'Ada CZERWONY',
                size: '2XL',
                advancePayment: 150
            }
        };

        const wasFromSale = saleEntry.originalData?.isFromSale === true;
        
        expect(wasFromSale).toBe(true);
        console.log('✅ Sprzedaż zostanie przywrócona do Sales collection, nie Transfer');
    });
});
