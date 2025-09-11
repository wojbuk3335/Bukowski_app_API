const request = require('supertest');
const app = require('../app/app'); // lub ścieżka do Twojej aplikacji Express
const History = require('../app/db/models/history');

describe('Korekta sprzedaży - historia', () => {
    let transactionId;

    beforeAll(async () => {
        // Dodaj przykładowy wpis korekty do bazy
        const entry = await History.create({
            transactionId: 'test-transaction-123',
            operation: 'Przeniesiono do korekt',
            from: 'KOREKTY',
            to: 'SPRZEDANE',
            product: 'Test Produkt 2XL',
            collectionName: 'Stan',
            date: new Date(),
        });
        transactionId = entry.transactionId;
    });

    afterAll(async () => {
        // Usuń testowe wpisy
        await History.deleteMany({ transactionId: 'test-transaction-123' });
    });

    test('Aktualizacja wpisu korekty na sprzedaż', async () => {
        const res = await request(app)
            .put('/api/history/update-correction-to-sale')
            .send({
                transactionId: 'test-transaction-123',
                correctFromSymbol: 'T',
                productDescription: 'Test Produkt 2XL',
                userEmail: 'test@example.com'
            });
        expect(res.statusCode).toBe(200);
        expect(res.body.updatedEntry).toBeDefined();
        expect(res.body.updatedEntry.operation).toBe('Odpisano ze stanu (sprzedaż)');
        expect(res.body.updatedEntry.to).toBe('SPRZEDANE');
        expect(res.body.updatedEntry.from).toBe('T');
    });
});
