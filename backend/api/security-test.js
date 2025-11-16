const axios = require('axios');

// 🔒 TESTY BEZPIECZEŃSTWA API
const BASE_URL = 'http://localhost:3000/api';

async function testSecurity() {
    console.log('🔒 ROZPOCZYNANIE TESTÓW BEZPIECZEŃSTWA...\n');

    // Test 1: Próba dostępu bez tokenu
    console.log('📋 TEST 1: Dostęp bez autoryzacji');
    try {
        const response = await axios.get(`${BASE_URL}/sales`);
        console.log('❌ BŁĄD: Dostęp bez tokenu został PRZYJĘTY!');
    } catch (error) {
        if (error.response?.status === 401) {
            console.log('✅ POPRAWNE: Dostęp bez tokenu został odrzucony (401)');
        } else {
            console.log(`⚠️ Niespodziewany błąd: ${error.response?.status}`);
        }
    }

    // Test 2: Próba logowania z błędnymi danymi
    console.log('\n📋 TEST 2: Logowanie z błędnymi danymi');
    try {
        const response = await axios.post(`${BASE_URL}/user/login`, {
            email: 'invalid-email',
            password: '123'
        });
        console.log('❌ BŁĄD: Logowanie z błędnymi danymi zostało PRZYJĘTE!');
    } catch (error) {
        if (error.response?.status === 400) {
            console.log('✅ POPRAWNE: Walidacja odrzuciła błędne dane (400)');
            console.log('   Błędy walidacji:', error.response.data.errors);
        } else {
            console.log(`⚠️ Status: ${error.response?.status}, Msg: ${error.response?.data?.message}`);
        }
    }

    // Test 3: Rate limiting - wiele prób logowania
    console.log('\n📋 TEST 3: Rate limiting (5 prób logowania)');
    for (let i = 1; i <= 6; i++) {
        try {
            const response = await axios.post(`${BASE_URL}/user/login`, {
                email: 'test@example.com',
                password: 'TestPassword123!'
            });
        } catch (error) {
            if (i <= 5) {
                console.log(`   Próba ${i}: ${error.response?.status} - ${error.response?.data?.message || 'Auth failed'}`);
            } else {
                if (error.response?.status === 429) {
                    console.log(`✅ POPRAWNE: Rate limiting zadziałał po 5 próbach (429)`);
                    console.log(`   Komunikat: ${error.response.data.error}`);
                } else {
                    console.log(`⚠️ Rate limiting nie zadziałał: ${error.response?.status}`);
                }
            }
        }
        // Małe opóźnienie między requestami
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Test 4: Próba NoSQL injection
    console.log('\n📋 TEST 4: NoSQL Injection');
    try {
        const response = await axios.post(`${BASE_URL}/user/login`, {
            email: { $ne: null },
            password: { $ne: null }
        });
        console.log('❌ BŁĄD: NoSQL injection nie został zablokowany!');
    } catch (error) {
        console.log('✅ POPRAWNE: NoSQL injection został zablokowany');
        console.log(`   Status: ${error.response?.status}`);
    }

    // Test 5: Sprawdzenie CSP headers
    console.log('\n📋 TEST 5: Content Security Policy headers');
    try {
        const response = await axios.get(`${BASE_URL}/user/login`);
    } catch (error) {
        const cspHeader = error.response?.headers['content-security-policy'];
        if (cspHeader && cspHeader.includes("default-src 'self'")) {
            console.log('✅ POPRAWNE: CSP header jest obecny');
            console.log(`   CSP: ${cspHeader.substring(0, 80)}...`);
        } else {
            console.log('⚠️ Brak odpowiedniego CSP header');
        }
    }

    console.log('\n🎯 TESTY ZAKOŃCZONE!');
}

testSecurity().catch(console.error);