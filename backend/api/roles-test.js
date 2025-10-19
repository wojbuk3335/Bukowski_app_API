const axios = require('axios');

// 🔒 TESTY AUTORYZACJI I RÓL
const BASE_URL = 'http://localhost:3000/api';

async function testRoles() {
    console.log('🔒 TESTOWANIE SYSTEMU RÓL I UPRAWNIEŃ...\n');

    let adminToken = null;
    let userToken = null;

    // Test 1: Próba utworzenia użytkownika administratora
    console.log('📋 TEST 1: Tworzenie użytkownika administratora');
    try {
        const response = await axios.post(`${BASE_URL}/user/signup`, {
            email: 'admin@test.com',
            password: 'AdminPass123!',
            symbol: 'ADMIN_TEST',
            role: 'admin'
        });
        console.log('✅ POPRAWNE: Admin został utworzony');
    } catch (error) {
        if (error.response?.status === 409) {
            console.log('ℹ️ Admin już istnieje - kontynuujemy test');
        } else {
            console.log('⚠️ Błąd tworzenia admina:', error.response?.data);
        }
    }

    // Test 2: Logowanie jako admin
    console.log('\n📋 TEST 2: Logowanie jako admin');
    try {
        const response = await axios.post(`${BASE_URL}/user/login`, {
            email: 'admin@test.com',
            password: 'AdminPass123!'
        });
        adminToken = response.data.token;
        console.log('✅ POPRAWNE: Admin zalogowany pomyślnie');
        console.log(`   Rola: ${response.data.role}`);
        console.log(`   Token: ${adminToken?.substring(0, 20)}...`);
    } catch (error) {
        console.log('❌ BŁĄD logowania admina:', error.response?.data?.message);
    }

    // Test 3: Próba utworzenia zwykłego użytkownika
    console.log('\n📋 TEST 3: Tworzenie zwykłego użytkownika');
    try {
        const response = await axios.post(`${BASE_URL}/user/signup`, {
            email: 'user@test.com',
            password: 'UserPass123!',
            symbol: 'USER_TEST',
            role: 'user',
            sellingPoint: 'TestPoint',
            location: 'TestLocation'
        });
        console.log('✅ POPRAWNE: Użytkownik został utworzony');
    } catch (error) {
        if (error.response?.status === 409) {
            console.log('ℹ️ Użytkownik już istnieje - kontynuujemy test');
        } else {
            console.log('⚠️ Błąd tworzenia użytkownika:', error.response?.data);
        }
    }

    // Test 4: Logowanie jako user
    console.log('\n📋 TEST 4: Logowanie jako zwykły użytkownik');
    try {
        const response = await axios.post(`${BASE_URL}/user/login`, {
            email: 'user@test.com',
            password: 'UserPass123!'
        });
        userToken = response.data.token;
        console.log('✅ POPRAWNE: Użytkownik zalogowany pomyślnie');
        console.log(`   Rola: ${response.data.role}`);
        console.log(`   Token: ${userToken?.substring(0, 20)}...`);
    } catch (error) {
        console.log('❌ BŁĄD logowania użytkownika:', error.response?.data?.message);
    }

    // Test 5: Admin próbuje usunąć wszystkie sprzedaże
    console.log('\n📋 TEST 5: Admin próbuje usunąć wszystkie sprzedaże');
    if (adminToken) {
        try {
            const response = await axios.delete(`${BASE_URL}/sales/delete-all-sales`, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            console.log('✅ POPRAWNE: Admin może usuwać wszystkie sprzedaże');
        } catch (error) {
            if (error.response?.status === 403) {
                console.log('❌ BŁĄD: Admin nie może usuwać - problem z rolami!');
            } else {
                console.log(`ℹ️ Response: ${error.response?.status} - ${error.response?.data?.message}`);
            }
        }
    }

    // Test 6: Zwykły użytkownik próbuje usunąć wszystkie sprzedaże
    console.log('\n📋 TEST 6: Zwykły użytkownik próbuje usunąć wszystkie sprzedaże');
    if (userToken) {
        try {
            const response = await axios.delete(`${BASE_URL}/sales/delete-all-sales`, {
                headers: { Authorization: `Bearer ${userToken}` }
            });
            console.log('❌ BŁĄD: Zwykły użytkownik może usuwać wszystkie sprzedaże!');
        } catch (error) {
            if (error.response?.status === 403) {
                console.log('✅ POPRAWNE: Zwykły użytkownik nie może usuwać wszystkich sprzedaży');
                console.log(`   Komunikat: ${error.response.data.message}`);
            } else {
                console.log(`⚠️ Niespodziewany status: ${error.response?.status}`);
            }
        }
    }

    // Test 7: Sprawdzenie refresh token
    console.log('\n📋 TEST 7: Test refresh token');
    if (adminToken) {
        try {
            const loginResponse = await axios.post(`${BASE_URL}/user/login`, {
                email: 'admin@test.com',
                password: 'AdminPass123!'
            });
            
            if (loginResponse.data.refreshToken) {
                const refreshResponse = await axios.post(`${BASE_URL}/user/refresh-token`, {
                    refreshToken: loginResponse.data.refreshToken
                });
                console.log('✅ POPRAWNE: Refresh token działa');
                console.log(`   Nowy token: ${refreshResponse.data.accessToken?.substring(0, 20)}...`);
            } else {
                console.log('⚠️ Brak refresh token w odpowiedzi');
            }
        } catch (error) {
            console.log('⚠️ Błąd refresh token:', error.response?.data?.message);
        }
    }

    console.log('\n🎯 TESTY RÓL ZAKOŃCZONE!');
}

testRoles().catch(console.error);