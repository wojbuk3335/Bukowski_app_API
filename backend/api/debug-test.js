const axios = require('axios');

// 🔍 DEBUG TEST
const BASE_URL = 'http://localhost:3000/api';

async function debugTest() {
    console.log('🔍 DEBUGOWANIE PROBLEMU...\n');

    // Test prostego endpointu
    console.log('📋 TEST: Sprawdzenie czy serwer odpowiada');
    try {
        const response = await axios.get(`${BASE_URL}/user/validate-token`);
        console.log('Response:', response.data);
    } catch (error) {
        console.log('Status:', error.response?.status);
        console.log('Message:', error.response?.data?.message);
        console.log('Error detail:', error.response?.data);
    }

    // Test tworzenia użytkownika z pełnym błędem
    console.log('\n📋 TEST: Tworzenie użytkownika - pełny błąd');
    try {
        const response = await axios.post(`${BASE_URL}/user/signup`, {
            email: 'debug@test.com',
            password: 'DebugPass123!',
            symbol: 'DEBUG_TEST',
            role: 'admin'
        });
        console.log('✅ Success:', response.data);
    } catch (error) {
        console.log('❌ Status:', error.response?.status);
        console.log('❌ Headers:', error.response?.headers);
        console.log('❌ Data:', error.response?.data);
        console.log('❌ Full error:', error.message);
    }
}

debugTest().catch(console.error);