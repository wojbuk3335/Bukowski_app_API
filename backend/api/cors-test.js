const axios = require('axios');

// 🌐 TESTY CORS I SECURITY HEADERS
const BASE_URL = 'http://localhost:3000/api';

async function testCorsAndHeaders() {
    console.log('🌐 TESTOWANIE CORS I SECURITY HEADERS...\n');

    // Test 1: Sprawdzenie wszystkich security headers
    console.log('📋 TEST 1: Security Headers');
    try {
        const response = await axios.get(`${BASE_URL}/user/login`, {
            validateStatus: () => true // Accept all status codes
        });
        
        const headers = response.headers;
        const securityHeaders = [
            'x-content-type-options',
            'x-frame-options', 
            'x-xss-protection',
            'strict-transport-security',
            'content-security-policy'
        ];

        console.log('🔒 Security Headers Check:');
        securityHeaders.forEach(header => {
            if (headers[header]) {
                console.log(`   ✅ ${header}: ${headers[header]}`);
            } else {
                console.log(`   ❌ BRAK: ${header}`);
            }
        });

    } catch (error) {
        console.log('Error checking headers:', error.message);
    }

    // Test 2: CORS preflight
    console.log('\n📋 TEST 2: CORS Headers');
    try {
        const response = await axios.options(`${BASE_URL}/user/login`);
        const corsHeaders = {
            'access-control-allow-origin': response.headers['access-control-allow-origin'],
            'access-control-allow-methods': response.headers['access-control-allow-methods'],
            'access-control-allow-headers': response.headers['access-control-allow-headers']
        };

        console.log('🌐 CORS Headers:');
        Object.entries(corsHeaders).forEach(([key, value]) => {
            console.log(`   ${key}: ${value || 'BRAK'}`);
        });

    } catch (error) {
        console.log('CORS test error:', error.response?.status);
    }

    // Test 3: Large payload test
    console.log('\n📋 TEST 3: Large Payload Protection');
    const largePayload = 'x'.repeat(60 * 1024 * 1024); // 60MB
    try {
        const response = await axios.post(`${BASE_URL}/user/login`, {
            email: 'test@test.com',
            password: largePayload
        });
    } catch (error) {
        if (error.code === 'ECONNRESET' || error.response?.status === 413) {
            console.log('✅ POPRAWNE: Large payload został odrzucony');
        } else {
            console.log(`⚠️ Status: ${error.response?.status || error.code}`);
        }
    }

    console.log('\n🎯 TESTY CORS I HEADERS ZAKOŃCZONE!');
}

testCorsAndHeaders().catch(console.error);