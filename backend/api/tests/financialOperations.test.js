const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');

// Import models and app
const FinancialOperation = require('../app/db/models/financialOperation');
const User = require('../app/db/models/user');

let mongoServer;
let testUser, authToken;
let testConnection;

describe('Financial Operations Tests', () => {
    beforeAll(async () => {
        // Create in-memory MongoDB instance
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        
        // Create separate connection for tests
        testConnection = mongoose.createConnection(mongoUri);
        
        // Bind models to test connection
        const TestFinancialOperation = testConnection.model('FinancialOperation', FinancialOperation.schema);
        const TestUser = testConnection.model('User', User.schema);
        
        // Replace global models with test models
        global.FinancialOperation = TestFinancialOperation;
        global.User = TestUser;
    });

    afterAll(async () => {
        // Cleanup database and close connections
        if (testConnection) {
            await testConnection.dropDatabase();
            await testConnection.close();
        }
        if (mongoServer) {
            await mongoServer.stop();
        }
    });

    beforeEach(async () => {
        // Clear collections using global models
        await global.FinancialOperation.deleteMany({});
        await global.User.deleteMany({});

        // Create test user
        testUser = await global.User.create({
            _id: new mongoose.Types.ObjectId(),
            email: 'test.financial@example.com',
            password: 'password123',
            sellingPoint: 'P',
            location: 'Test Location P',
            symbol: 'P',
            role: 'user'
        });

        // Get auth token for API requests
        const loginResponse = await request(app)
            .post('/api/user/login')
            .send({
                email: 'test.financial@example.com',
                password: 'password123'
            });
        
        authToken = loginResponse.body.token;
    });

    describe('Model Creation Tests', () => {
        it('Powinien utworzyć operację dodania kwoty', async () => {
            const additionOperation = await FinancialOperation.create({
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
            const deductionOperation = await FinancialOperation.create({
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
            try {
                await FinancialOperation.create({
                    userSymbol: 'P',
                    amount: 100
                    // Missing required fields: currency, type, reason
                });
                fail('Should have thrown validation error');
            } catch (error) {
                expect(error.name).toBe('ValidationError');
                expect(error.errors.currency).toBeTruthy();
                expect(error.errors.type).toBeTruthy();
                expect(error.errors.reason).toBeTruthy();
            }

            console.log('✅ Walidacja obowiązkowych pól działa poprawnie');
        });

        it('Powinien sprawdzić poprawność typu operacji', async () => {
            try {
                await FinancialOperation.create({
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
    });

    describe('API Endpoint Tests', () => {
        it('Powinien utworzyć operację finansową przez API', async () => {
            const operationData = {
                userSymbol: 'P',
                amount: 300,
                currency: 'PLN',
                type: 'addition',
                reason: 'Test dodania kwoty przez API',
                date: new Date().toISOString()
            };

            const response = await request(app)
                .post('/api/financial-operations')
                .set('Authorization', `Bearer ${authToken}`)
                .send(operationData)
                .expect(201);

            expect(response.body).toBeTruthy();
            expect(response.body.userSymbol).toBe('P');
            expect(response.body.amount).toBe(300);
            expect(response.body.type).toBe('addition');

            console.log('✅ Operacja finansowa utworzona przez API');
        });

        it('Powinien pobrać wszystkie operacje finansowe przez API', async () => {
            // Create test operations
            await FinancialOperation.create([
                {
                    userSymbol: 'P',
                    amount: 500,
                    currency: 'PLN',
                    type: 'addition',
                    reason: 'Pierwsza operacja',
                    date: new Date()
                },
                {
                    userSymbol: 'P',
                    amount: -200,
                    currency: 'PLN',
                    type: 'deduction',
                    reason: 'Druga operacja',
                    date: new Date()
                }
            ]);

            const response = await request(app)
                .get('/api/financial-operations')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toBeInstanceOf(Array);
            expect(response.body).toHaveLength(2);
            expect(response.body[0].userSymbol).toBe('P');
            expect(response.body[1].userSymbol).toBe('P');

            console.log('✅ Pobrano operacje finansowe przez API');
        });

        it('Powinien pobrać operacje finansowe dla konkretnego użytkownika', async () => {
            // Create operations for different users
            await FinancialOperation.create([
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
                }
            ]);

            const response = await request(app)
                .get('/api/financial-operations/user/P')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toBeInstanceOf(Array);
            expect(response.body).toHaveLength(1);
            expect(response.body[0].userSymbol).toBe('P');
            expect(response.body[0].reason).toBe('Operacja użytkownika P');

            console.log('✅ Pobrano operacje finansowe dla konkretnego użytkownika');
        });

        it('Powinien usunąć operację finansową przez API', async () => {
            // Create test operation
            const operation = await FinancialOperation.create({
                userSymbol: 'P',
                amount: 250,
                currency: 'PLN',
                type: 'addition',
                reason: 'Operacja do usunięcia',
                date: new Date()
            });

            const response = await request(app)
                .delete(`/api/financial-operations/${operation._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.message).toBe('Financial operation deleted successfully');

            // Verify operation was deleted
            const deletedOperation = await FinancialOperation.findById(operation._id);
            expect(deletedOperation).toBeNull();

            console.log('✅ Operacja finansowa usunięta przez API');
        });

        it('Powinien wymagać autoryzacji', async () => {
            const operationData = {
                userSymbol: 'P',
                amount: 100,
                currency: 'PLN',
                type: 'addition',
                reason: 'Test bez autoryzacji'
            };

            await request(app)
                .post('/api/financial-operations')
                .send(operationData)
                .expect(401);

            console.log('✅ Autoryzacja wymagana dla API');
        });
    });

    describe('Business Logic Tests', () => {
        it('Powinien obliczyć bilans operacji dla użytkownika', async () => {
            // Create test operations
            await FinancialOperation.create([
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

            const operations = await FinancialOperation.find({ userSymbol: 'P' });
            const balance = operations.reduce((sum, op) => sum + op.amount, 0);

            expect(balance).toBe(600); // 500 - 200 + 300 = 600
            console.log('✅ Bilans operacji obliczony poprawnie: +600 PLN');
        });

        it('Powinien grupować operacje według waluty', async () => {
            // Create operations in different currencies
            await FinancialOperation.create([
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

            const operations = await FinancialOperation.find({ userSymbol: 'P' });
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
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            // Create operations for different dates
            await FinancialOperation.create([
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
            const todayOperations = await FinancialOperation.find({
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
    });

    describe('Integration Tests', () => {
        it('Powinien symulować pełny przepływ: dodanie i odpisanie kwoty', async () => {
            // Step 1: Add money
            const addResponse = await request(app)
                .post('/api/financial-operations')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    userSymbol: 'P',
                    amount: 1000,
                    currency: 'PLN',
                    type: 'addition',
                    reason: 'Wpłata początkowa',
                    date: new Date().toISOString()
                })
                .expect(201);

            // Step 2: Deduct money
            const deductResponse = await request(app)
                .post('/api/financial-operations')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    userSymbol: 'P',
                    amount: -300,
                    currency: 'PLN',
                    type: 'deduction',
                    reason: 'Wypłata testowa',
                    date: new Date().toISOString()
                })
                .expect(201);

            // Step 3: Check balance
            const operationsResponse = await request(app)
                .get('/api/financial-operations/user/P')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            const operations = operationsResponse.body;
            const balance = operations.reduce((sum, op) => sum + op.amount, 0);

            expect(balance).toBe(700); // 1000 - 300 = 700
            expect(operations).toHaveLength(2);

            console.log('✅ Pełny przepływ operacji finansowych:');
            console.log('   Wpłata: +1000 PLN');
            console.log('   Wypłata: -300 PLN');
            console.log('   Bilans: +700 PLN');
        });
    });
});