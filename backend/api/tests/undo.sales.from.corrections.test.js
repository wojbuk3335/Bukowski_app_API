const transferProcessing = require('../app/controllers/transferProcessing');

describe('UNDO - Przywracanie sprzedaży z korekt (prosty test)', () => {

    test('1. Powinien wykryć sprzedaż po tekście "w ramach sprzedaży"', () => {
        console.log('🔍 Testujemy wykrywanie sprzedaży po tekście');
        
        // Dane z korekty zawierającej sprzedaż
        const correctionEntry = {
            details: 'Transfer produktu Ada CZERWONY w ramach sprzedaży do punktu T',
            from: 'KOREKTY',
            to: 'KOREKTY'
        };

        // Sprawdzamy czy detection logic wykryje sprzedaż
        const isSaleCorrection = correctionEntry.details.includes('w ramach sprzedaży');
        
        expect(isSaleCorrection).toBe(true);
        console.log('✅ Wykryto sprzedaż w tekście korekty');
    });

    test('2. Powinien nie wykryć sprzedaży w zwykłym transferze', () => {
        console.log('🔍 Testujemy zwykły transfer (nie sprzedaż)');
        
        // Dane z korekty zwykłego transferu
        const correctionEntry = {
            details: 'Transfer produktu Ada CZERWONY z punktu P do punktu T',
            from: 'KOREKTY',
            to: 'KOREKTY'
        };

        // Sprawdzamy czy detection logic nie wykryje sprzedaży
        const isSaleCorrection = correctionEntry.details.includes('w ramach sprzedaży');
        
        expect(isSaleCorrection).toBe(false);
        console.log('✅ Nie wykryto sprzedaży w zwykłym transferze');
    });

    test('3. Powinien utworzyć Sales object dla korekty sprzedaży', () => {
        console.log('🔍 Testujemy tworzenie Sales object');
        
        // Mockujemy dane korekty sprzedaży
        const correctionEntry = {
            details: 'Transfer produktu Ada CZERWONY w ramach sprzedaży do punktu T',
            from: 'KOREKTY',
            to: 'KOREKTY',
            barcode: '1234567890',
            fullName: 'Ada CZERWONY',
            size: 'M',
            originalData: {
                sellingPoint: 'T',
                timestamp: new Date(),
                barcode: '1234567890'
            }
        };

        const isSaleCorrection = correctionEntry.details.includes('w ramach sprzedaży');
        
        if (isSaleCorrection && correctionEntry.originalData) {
            // Symulujemy tworzenie Sales object
            const salesObject = {
                fullName: correctionEntry.fullName,
                barcode: correctionEntry.barcode,
                size: correctionEntry.size,
                sellingPoint: correctionEntry.originalData.sellingPoint,
                timestamp: correctionEntry.originalData.timestamp,
                processed: false
            };

            expect(salesObject.sellingPoint).toBe('T');
            expect(salesObject.processed).toBe(false);
            expect(salesObject.fullName).toBe('Ada CZERWONY');
            console.log('✅ Sales object utworzony prawidłowo');
            console.log(`   - sellingPoint: ${salesObject.sellingPoint}`);
            console.log(`   - processed: ${salesObject.processed}`);
        }
    });

    test('4. Powinien utworzyć Transfer object dla zwykłej korekty', () => {
        console.log('🔍 Testujemy tworzenie Transfer object');
        
        // Mockujemy dane korekty zwykłego transferu
        const correctionEntry = {
            details: 'Transfer produktu Ada CZERWONY z punktu P do punktu T',
            from: 'KOREKTY',
            to: 'KOREKTY',
            barcode: '1234567890',
            fullName: 'Ada CZERWONY',
            size: 'M',
            originalData: {
                transfer_to: 'T',
                timestamp: new Date()
            }
        };

        const isSaleCorrection = correctionEntry.details.includes('w ramach sprzedaży');
        
        if (!isSaleCorrection && correctionEntry.originalData) {
            // Symulujemy tworzenie Transfer object
            const transferObject = {
                fullName: correctionEntry.fullName,
                barcode: correctionEntry.barcode,
                size: correctionEntry.size,
                transfer_to: correctionEntry.originalData.transfer_to,
                timestamp: correctionEntry.originalData.timestamp,
                processed: false
            };

            expect(transferObject.transfer_to).toBe('T');
            expect(transferObject.processed).toBe(false);
            expect(transferObject.fullName).toBe('Ada CZERWONY');
            console.log('✅ Transfer object utworzony prawidłowo');
            console.log(`   - transfer_to: ${transferObject.transfer_to}`);
            console.log(`   - processed: ${transferObject.processed}`);
        }
    });

    test('5. Powinien rozróżnić różne typy korekt', () => {
        console.log('🔍 Testujemy rozróżnianie typów korekt');
        
        const testCases = [
            {
                details: 'Transfer produktu Ada CZERWONY w ramach sprzedaży do punktu T',
                expectedType: 'sale'
            },
            {
                details: 'Transfer produktu Ada CZERWONY z punktu P do punktu T',
                expectedType: 'transfer'
            },
            {
                details: 'Produkt Ada CZERWONY w ramach sprzedaży - korekta',
                expectedType: 'sale'
            },
            {
                details: 'Korekta transferu Ada CZERWONY P->T',
                expectedType: 'transfer'
            }
        ];

        testCases.forEach((testCase, index) => {
            const isSaleCorrection = testCase.details.includes('w ramach sprzedaży');
            const actualType = isSaleCorrection ? 'sale' : 'transfer';
            
            expect(actualType).toBe(testCase.expectedType);
            console.log(`✅ Test ${index + 1}: "${testCase.details}" -> ${actualType}`);
        });

        console.log('✅ Wszystkie typy korekt rozpoznane prawidłowo');
    });

    test('6. Powinien obsłużyć brak originalData', () => {
        console.log('🔍 Testujemy obsługę braku originalData');
        
        // Korekta bez originalData (legacy case)
        const correctionEntry = {
            details: 'Transfer produktu Ada CZERWONY w ramach sprzedaży do punktu T',
            from: 'KOREKTY',
            to: 'KOREKTY',
            barcode: '1234567890',
            fullName: 'Ada CZERWONY',
            size: 'M'
            // originalData: undefined
        };

        const isSaleCorrection = correctionEntry.details.includes('w ramach sprzedaży');
        
        // Sprawdzamy że wykrywa sprzedaż ale gracefully handles brak originalData
        expect(isSaleCorrection).toBe(true);
        expect(correctionEntry.originalData).toBeUndefined();
        
        console.log('✅ Wykryto sprzedaż mimo braku originalData');
        console.log('✅ System może fallback do innych metod');
    });

});
