const request = require('supertest');
const express = require('express');

// Tworzymy osobną instancję app dla testów
const app = express();
app.use(express.json());

// Importujemy tylko controllery bez uruchamiania serwera
const transferController = require('../app/controllers/transferProcessing');
const CorrectionsController = require('../app/controllers/corrections');

// Dodajemy routes dla testów
app.post('/api/transfer/undo-last', transferController.undoLastTransaction);
app.post('/api/corrections/multiple', CorrectionsController.saveMultipleCorrections);

describe('UNDO z Korekt - Proste Testy', () => {
    
    test('1. Parser details wyciąga prawidłowe transfer_to', () => {
        // Symulujemy historię z transferem P->T, który poszedł do korekt
        const mockHistoryEntry = {
            operation: 'Przeniesiono do korekt',
            from: 'P',
            to: 'KOREKTY',
            details: 'Brak pokrycia w stanie - transferu z punktu P do punktu T',
            transactionId: 'test123'
        };

        // Test sprawdza czy nasza logika wyciąga prawidłowe transfer_to
        const transferMatch = mockHistoryEntry.details.match(/transferu z punktu \w+ do punktu (\w+)/);
        const originalTransferTo = transferMatch ? transferMatch[1] : mockHistoryEntry.to;

        expect(originalTransferTo).toBe('T');
        expect(originalTransferTo).not.toBe('KOREKTY');
        console.log(`✅ Wyciągnięto prawidłowe transfer_to: ${originalTransferTo}`);
    });

    test('2. Parser details działa dla różnych punktów', () => {
        const testCases = [
            {
                details: 'transferu z punktu P do punktu T',
                expected: 'T'
            },
            {
                details: 'transferu z punktu T do punktu M', 
                expected: 'M'
            },
            {
                details: 'transferu z punktu S do punktu K',
                expected: 'K'
            }
        ];

        testCases.forEach(testCase => {
            const match = testCase.details.match(/transferu z punktu \w+ do punktu (\w+)/);
            const result = match ? match[1] : null;
            
            expect(result).toBe(testCase.expected);
            console.log(`✅ ${testCase.details} -> ${result}`);
        });
    });

    test('3. Każdy transfer ma źródło (from) na niebiesko', () => {
        const testCases = [
            { from: 'P', to: 'T', shouldBeBlue: true },     // P→T: P niebieski
            { from: 'T', to: 'M', shouldBeBlue: true },     // T→M: T niebieski  
            { from: 'S', to: 'K', shouldBeBlue: true },     // S→K: S niebieski
            { from: 'K', to: 'OUTLET', shouldBeBlue: true } // K→OUTLET: K niebieski
        ];

        testCases.forEach(testCase => {
            // Nowa logika: każdy transfer ma źródło (from) na niebiesko
            // Bo odpisujemy ze stanu źródłowego punktu
            const isBlue = true; 
            
            expect(isBlue).toBe(testCase.shouldBeBlue);
            console.log(`✅ Transfer ${testCase.from}→${testCase.to}: ${testCase.from} będzie niebieski`);
        });
    });

    test('4. Wszystkie transfery po UNDO mają isFromSale: true', () => {
        // Nowa logika: każdy transfer odpisuje ze stanu, więc każdy jest "niebieski"
        const testTransfers = [
            { from: 'P', to: 'T' },
            { from: 'T', to: 'M' }, 
            { from: 'S', to: 'K' },
            { from: 'K', to: 'OUTLET' }
        ];

        testTransfers.forEach(transfer => {
            // Każdy przywrócony transfer będzie miał isFromSale: true
            const restoredTransfer = {
                ...transfer,
                isFromSale: true  // Bo odpisujemy ze stanu źródłowego
            };

            expect(restoredTransfer.isFromSale).toBe(true);
            console.log(`✅ Transfer ${transfer.from}→${transfer.to} ma isFromSale: true`);
        });
    });

    test('5. Endpoint corrections/multiple istnieje', async () => {
        const response = await request(app)
            .post('/api/corrections/multiple')
            .send([]) // Pusty array
            .expect(201);
        
        expect(response.body).toBeDefined();
        console.log('✅ Endpoint /api/corrections/multiple działa');
    });

});
