const axios = require('axios');

// 🔐 TESTY HASŁA I BRUTE FORCE
const BASE_URL = 'http://localhost:3000/api';

async function testPasswordSecurity() {
    console.log('🔐 TESTOWANIE BEZPIECZEŃSTWA HASEŁ...\n');

    // Test 1: Słabe hasła przy rejestracji
    console.log('📋 TEST 1: Validacja słabych haseł');
    const weakPasswords = ['123', 'password', 'admin', 'qwerty', '111111'];
    
    for (const weakPassword of weakPasswords) {
        try {
            const response = await axios.post(`${BASE_URL}/user/signup`, {
                email: `test${Date.now()}@test.com`,
                password: weakPassword,
                firstName: 'Test',
                lastName: 'User'
            });
            console.log(`❌ PROBLEM: Słabe hasło "${weakPassword}" zostało zaakceptowane!`);
        } catch (error) {
            if (error.response?.status === 400) {
                console.log(`✅ POPRAWNE: Słabe hasło "${weakPassword}" zostało odrzucone`);
            }
        }
    }

    // Test 2: Brute force attack simulation
    console.log('\n📋 TEST 2: Ochrona przed Brute Force');
    const email = 'admin@bukowski.com';
    let blockedCount = 0;

    for (let i = 1; i <= 10; i++) {
        try {
            const response = await axios.post(`${BASE_URL}/user/login`, {
                email: email,
                password: `wrongpassword${i}`
            });
        } catch (error) {
            if (error.response?.status === 429) {
                blockedCount++;
                console.log(`✅ Próba ${i}: Rate limit aktywny (429)`);
            } else if (error.response?.status === 401) {
                console.log(`   Próba ${i}: Niepoprawne dane (401)`);
            }
        }
        
        // Małe opóźnienie między próbami
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (blockedCount > 0) {
        console.log(`✅ POPRAWNE: Rate limiting zadziałał po ${10 - blockedCount + 1} próbach`);
    } else {
        console.log(`⚠️ UWAGA: Rate limiting może być za słaby`);
    }

    // Test 3: SQL/NoSQL injection w haśle
    console.log('\n📋 TEST 3: Injection w polu hasła');
    const injectionAttempts = [
        "' OR '1'='1",
        '{"$ne": null}',
        '{"$gt": ""}',
        '<script>alert("XSS")</script>',
        '../../etc/passwd'
    ];

    for (const injection of injectionAttempts) {
        try {
            const response = await axios.post(`${BASE_URL}/user/login`, {
                email: 'test@test.com',
                password: injection
            });
            console.log(`❌ PROBLEM: Injection "${injection}" nie został zablokowany!`);
        } catch (error) {
            if (error.response?.status === 400 || error.response?.status === 401) {
                console.log(`✅ POPRAWNE: Injection "${injection}" został zablokowany`);
            }
        }
    }

    console.log('\n🎯 TESTY HASEŁ ZAKOŃCZONE!');
}

testPasswordSecurity().catch(console.error);