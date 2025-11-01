const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Import model directly
const FinancialOperation = require('../app/db/models/financialOperation');

let mongoServer;
let connection;

describe('Financial Operations Model Tests', () => {
    beforeAll(async () => {
        // Create in-memory MongoDB instance
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        
        // Create separate connection for tests
        connection = await mongoose.createConnection(mongoUri);
        
        // Bind model to test connection
        connection.model('FinancialOperation', FinancialOperation.schema);
    });

    afterAll(async () => {
        // Cleanup database and close connections
        if (connection) {
            await connection.close();
        }
        if (mongoServer) {
            await mongoServer.stop();
        }
    });

    beforeEach(async () => {
        // Clear collection
        const TestModel = connection.model('FinancialOperation');
        await TestModel.deleteMany({});
    });

    describe('Model Creation Tests', () => {
        it('Powinien utworzyć operację dodania kwoty', async () => {
            const TestModel = connection.model('FinancialOperation');
            
            const additionOperation = await TestModel.create({
                userSymbol: 'P',
                amount: 500,
                currency: 'PLN',
                type: 'addition',
                reason: 'Wpłata gotówki',
                date: new Date()
            });

            expect(additionOperation).toBeTruthy();
            expect(additionOperation.userSymbol).toBe('P');
            expect(additionOperation.amount).toBe(500);
            expect(additionOperation.type).toBe('addition');
            expect(additionOperation.currency).toBe('PLN');

            console.log('✅ Operacja dodania kwoty utworzona pomyślnie');
        });

        it('Powinien utworzyć operację odpisania kwoty', async () => {
            const TestModel = connection.model('FinancialOperation');
            
            const deductionOperation = await TestModel.create({
                userSymbol: 'P',
                amount: -200,
                currency: 'PLN',
                type: 'deduction',
                reason: 'Wypłata gotówki',
                date: new Date()
            });

            expect(deductionOperation).toBeTruthy();
            expect(deductionOperation.userSymbol).toBe('P');
            expect(deductionOperation.amount).toBe(-200);
            expect(deductionOperation.type).toBe('deduction');
            expect(deductionOperation.currency).toBe('PLN');

            console.log('✅ Operacja odpisania kwoty utworzona pomyślnie');
        });

        it('Powinien wymagać wszystkich obowiązkowych pól', async () => {
            const TestModel = connection.model('FinancialOperation');
            
            try {
                await TestModel.create({
                    userSymbol: 'P',
                    amount: 100
                    // Missing required fields: type, reason (currency has default)
                });
                fail('Should have thrown validation error');
            } catch (error) {
                expect(error.name).toBe('ValidationError');
                expect(error.errors.type).toBeTruthy();
                expect(error.errors.reason).toBeTruthy();
                // currency nie będzie w błędach bo ma wartość domyślną
            }

            console.log('✅ Walidacja obowiązkowych pól działa poprawnie');
        });

        it('Powinien sprawdzić poprawność typu operacji', async () => {
            const TestModel = connection.model('FinancialOperation');
            
            try {
                await TestModel.create({
                    userSymbol: 'P',
                    amount: 100,
                    currency: 'PLN',
                    type: 'invalid_type',
                    reason: 'Test reason',
                    date: new Date()
                });
                fail('Should have thrown validation error');
            } catch (error) {
                expect(error.name).toBe('ValidationError');
                expect(error.errors.type).toBeTruthy();
            }

            console.log('✅ Walidacja typu operacji działa poprawnie');
        });

        it('Powinien ustawić domyślną walutę PLN', async () => {
            const TestModel = connection.model('FinancialOperation');
            
            const operation = await TestModel.create({
                userSymbol: 'P',
                amount: 300,
                type: 'addition',
                reason: 'Test bez waluty'
                // currency not specified - should default to PLN
            });

            expect(operation.currency).toBe('PLN');
            console.log('✅ Domyślna waluta PLN ustawiona poprawnie');
        });

        it('Powinien ustawić domyślną datę', async () => {
            const TestModel = connection.model('FinancialOperation');
            
            const beforeCreate = new Date();
            const operation = await TestModel.create({
                userSymbol: 'P',
                amount: 200,
                currency: 'PLN',
                type: 'addition',
                reason: 'Test bez daty'
                // date not specified - should default to now
            });
            const afterCreate = new Date();

            expect(operation.date).toBeTruthy();
            expect(operation.date.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
            expect(operation.date.getTime()).toBeLessThanOrEqual(afterCreate.getTime());

            console.log('✅ Domyślna data ustawiona poprawnie');
        });
    });

    describe('Business Logic Tests', () => {
        it('Powinien obliczyć bilans operacji dla użytkownika', async () => {
            const TestModel = connection.model('FinancialOperation');
            
            // Create test operations
            await TestModel.create([
                {
                    userSymbol: 'P',
                    amount: 500,
                    currency: 'PLN',
                    type: 'addition',
                    reason: 'Wpłata 1',
                    date: new Date()
                },
                {
                    userSymbol: 'P',
                    amount: -200,
                    currency: 'PLN',
                    type: 'deduction',
                    reason: 'Wypłata 1',
                    date: new Date()
                },
                {
                    userSymbol: 'P',
                    amount: 300,
                    currency: 'PLN',
                    type: 'addition',
                    reason: 'Wpłata 2',
                    date: new Date()
                }
            ]);

            const operations = await TestModel.find({ userSymbol: 'P' });
            const balance = operations.reduce((sum, op) => sum + op.amount, 0);

            expect(balance).toBe(600); // 500 - 200 + 300 = 600
            console.log('✅ Bilans operacji obliczony poprawnie: +600 PLN');
        });

        it('Powinien grupować operacje według waluty', async () => {
            const TestModel = connection.model('FinancialOperation');
            
            // Create operations in different currencies
            await TestModel.create([
                {
                    userSymbol: 'P',
                    amount: 500,
                    currency: 'PLN',
                    type: 'addition',
                    reason: 'Wpłata PLN',
                    date: new Date()
                },
                {
                    userSymbol: 'P',
                    amount: 100,
                    currency: 'EUR',
                    type: 'addition',
                    reason: 'Wpłata EUR',
                    date: new Date()
                },
                {
                    userSymbol: 'P',
                    amount: -50,
                    currency: 'EUR',
                    type: 'deduction',
                    reason: 'Wypłata EUR',
                    date: new Date()
                }
            ]);

            const operations = await TestModel.find({ userSymbol: 'P' });
            const balancesByCurrency = {};
            
            operations.forEach(op => {
                balancesByCurrency[op.currency] = (balancesByCurrency[op.currency] || 0) + op.amount;
            });

            expect(balancesByCurrency.PLN).toBe(500);
            expect(balancesByCurrency.EUR).toBe(50); // 100 - 50 = 50

            console.log('✅ Operacje pogrupowane według waluty:');
            console.log('   PLN: +500');
            console.log('   EUR: +50');
        });

        it('Powinien filtrować operacje według daty', async () => {
            const TestModel = connection.model('FinancialOperation');
            
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            // Create operations for different dates
            await TestModel.create([
                {
                    userSymbol: 'P',
                    amount: 300,
                    currency: 'PLN',
                    type: 'addition',
                    reason: 'Operacja dzisiejsza',
                    date: today
                },
                {
                    userSymbol: 'P',
                    amount: 200,
                    currency: 'PLN',
                    type: 'addition',
                    reason: 'Operacja wczorajsza',
                    date: yesterday
                }
            ]);

            const todayString = today.toISOString().split('T')[0];
            const todayOperations = await TestModel.find({
                userSymbol: 'P',
                date: {
                    $gte: new Date(todayString),
                    $lt: new Date(new Date(todayString).getTime() + 24 * 60 * 60 * 1000)
                }
            });

            expect(todayOperations).toHaveLength(1);
            expect(todayOperations[0].reason).toBe('Operacja dzisiejsza');

            console.log('✅ Filtrowanie operacji według daty działa poprawnie');
        });

        it('Powinien filtrować operacje według użytkownika', async () => {
            const TestModel = connection.model('FinancialOperation');
            
            // Create operations for different users
            await TestModel.create([
                {
                    userSymbol: 'P',
                    amount: 300,
                    currency: 'PLN',
                    type: 'addition',
                    reason: 'Operacja użytkownika P',
                    date: new Date()
                },
                {
                    userSymbol: 'Q',
                    amount: 400,
                    currency: 'PLN',
                    type: 'addition',
                    reason: 'Operacja użytkownika Q',
                    date: new Date()
                },
                {
                    userSymbol: 'P',
                    amount: -100,
                    currency: 'PLN',
                    type: 'deduction',
                    reason: 'Druga operacja użytkownika P',
                    date: new Date()
                }
            ]);

            const userPOperations = await TestModel.find({ userSymbol: 'P' });
            const userQOperations = await TestModel.find({ userSymbol: 'Q' });

            expect(userPOperations).toHaveLength(2);
            expect(userQOperations).toHaveLength(1);
            
            const balanceP = userPOperations.reduce((sum, op) => sum + op.amount, 0);
            const balanceQ = userQOperations.reduce((sum, op) => sum + op.amount, 0);
            
            expect(balanceP).toBe(200); // 300 - 100 = 200
            expect(balanceQ).toBe(400);

            console.log('✅ Filtrowanie operacji według użytkownika działa poprawnie:');
            console.log('   Użytkownik P: +200 PLN (2 operacje)');
            console.log('   Użytkownik Q: +400 PLN (1 operacja)');
        });

        it('Powinien obsłużyć różne typy operacji', async () => {
            const TestModel = connection.model('FinancialOperation');
            
            const validTypes = ['addition', 'deduction', 'advance_taken', 'advance_payment', 'purchase', 'refund', 'deposit', 'withdrawal'];
            
            for (const type of validTypes) {
                const operation = await TestModel.create({
                    userSymbol: 'P',
                    amount: type.includes('deduction') || type.includes('taken') || type.includes('purchase') || type.includes('withdrawal') ? -100 : 100,
                    currency: 'PLN',
                    type: type,
                    reason: `Test ${type}`,
                    date: new Date()
                });

                expect(operation.type).toBe(type);
            }

            const allOperations = await TestModel.find({ userSymbol: 'P' });
            expect(allOperations).toHaveLength(validTypes.length);

            console.log('✅ Wszystkie typy operacji obsłużone poprawnie:');
            console.log(`   Utworzono ${validTypes.length} operacji różnych typów`);
        });
    });

    describe('Data Validation Tests', () => {
        it('Powinien akceptować dodatnie i ujemne kwoty', async () => {
            const TestModel = connection.model('FinancialOperation');
            
            const positiveOp = await TestModel.create({
                userSymbol: 'P',
                amount: 500.50,
                currency: 'PLN',
                type: 'addition',
                reason: 'Pozytywna kwota',
                date: new Date()
            });

            const negativeOp = await TestModel.create({
                userSymbol: 'P',
                amount: -200.75,
                currency: 'PLN',
                type: 'deduction',
                reason: 'Negatywna kwota',
                date: new Date()
            });

            expect(positiveOp.amount).toBe(500.50);
            expect(negativeOp.amount).toBe(-200.75);

            console.log('✅ Dodatnie i ujemne kwoty obsłużone poprawnie');
        });

        it('Powinien obsłużyć różne waluty', async () => {
            const TestModel = connection.model('FinancialOperation');
            
            const currencies = ['PLN', 'EUR', 'USD', 'GBP'];
            
            for (const currency of currencies) {
                const operation = await TestModel.create({
                    userSymbol: 'P',
                    amount: 100,
                    currency: currency,
                    type: 'addition',
                    reason: `Test ${currency}`,
                    date: new Date()
                });

                expect(operation.currency).toBe(currency);
            }

            console.log('✅ Różne waluty obsłużone poprawnie: PLN, EUR, USD, GBP');
        });

        it('Powinien zapisać timestamp utworzenia i aktualizacji', async () => {
            const TestModel = connection.model('FinancialOperation');
            
            const operation = await TestModel.create({
                userSymbol: 'P',
                amount: 250,
                currency: 'PLN',
                type: 'addition',
                reason: 'Test timestampów',
                date: new Date()
            });

            expect(operation.createdAt).toBeTruthy();
            expect(operation.updatedAt).toBeTruthy();
            expect(operation.createdAt.getTime()).toBe(operation.updatedAt.getTime());

            console.log('✅ Timestampy utworzenia i aktualizacji zapisane poprawnie');
        });
    });
});