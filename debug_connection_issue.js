const axios = require('axios');

// 🔍 DIAGNOSTYKA PROBLEMU POŁĄCZENIA Z NOWEJ LOKALIZACJI
async function diagnoseProblem() {
    console.log('🔍 DIAGNOZOWANIE PROBLEMU POŁĄCZENIA...\n');

    const SERVER_URL = 'https://bukowskiapp.pl'; // Zmień na adres swojego serwera
    const API_URL = `${SERVER_URL}/api`;

    // Test 1: Podstawowy test połączenia
    console.log('📋 TEST 1: Podstawowe połączenie z serwerem');
    try {
        const response = await axios.get(SERVER_URL, { timeout: 10000 });
        console.log(`✅ Status: ${response.status}`);
        console.log(`✅ Server responds: OK`);
    } catch (error) {
        console.log(`❌ Błąd połączenia: ${error.message}`);
        if (error.code === 'ECONNREFUSED') {
            console.log('💡 Serwer może być wyłączony lub zablokowany przez firewall');
        }
        if (error.code === 'ETIMEDOUT') {
            console.log('💡 Timeout - możliwe blokowanie IP lub problemy sieciowe');
        }
    }

    // Test 2: Test API endpoint
    console.log('\n📋 TEST 2: Test API endpoint');
    try {
        const response = await axios.get(`${API_URL}/user/login`, { 
            timeout: 10000,
            validateStatus: () => true 
        });
        console.log(`✅ API Status: ${response.status}`);
        console.log(`✅ CORS Headers:`, {
            'Access-Control-Allow-Origin': response.headers['access-control-allow-origin'],
            'Access-Control-Allow-Methods': response.headers['access-control-allow-methods']
        });
    } catch (error) {
        console.log(`❌ API Błąd: ${error.message}`);
    }

    // Test 3: Test z różnych IP/lokalizacji
    console.log('\n📋 TEST 3: Informacje o IP');
    try {
        const ipResponse = await axios.get('https://api.ipify.org?format=json');
        console.log(`🌐 Twoje obecne IP: ${ipResponse.data.ip}`);
        
        // Test geolokalizacji
        const geoResponse = await axios.get(`http://ip-api.com/json/${ipResponse.data.ip}`);
        console.log(`📍 Lokalizacja: ${geoResponse.data.city}, ${geoResponse.data.country}`);
        console.log(`📡 ISP: ${geoResponse.data.isp}`);
        
    } catch (error) {
        console.log(`❌ Błąd sprawdzania IP: ${error.message}`);
    }

    // Test 4: Test logowania
    console.log('\n📋 TEST 4: Test logowania API');
    try {
        const loginData = {
            email: 'test@example.com', // Użyj testowego konta
            password: 'testpassword'
        };
        
        const response = await axios.post(`${API_URL}/user/login`, loginData, {
            timeout: 10000,
            validateStatus: () => true
        });
        
        console.log(`📊 Login Status: ${response.status}`);
        if (response.data) {
            console.log(`📝 Response:`, response.data.message || response.data.error || 'No message');
        }
        
    } catch (error) {
        console.log(`❌ Login Error: ${error.message}`);
    }

    // Test 5: Sprawdzenie DNS
    console.log('\n📋 TEST 5: DNS Resolution');
    const dns = require('dns').promises;
    try {
        const addresses = await dns.lookup('bukowskiapp.pl'); // Zmień na swoją domenę
        console.log(`🔍 DNS resolved to: ${addresses.address}`);
    } catch (error) {
        console.log(`❌ DNS Error: ${error.message}`);
    }

    console.log('\n💡 MOŻLIWE PRZYCZYNY PROBLEMU:');
    console.log('1. 🔥 Firewall serwera blokuje nowe IP');
    console.log('2. 🔒 Middleware walidacji IP (ipValidator.js)');
    console.log('3. 🚫 Rate limiting dla nowego IP');
    console.log('4. 🌐 Problemy z CORS dla nowej lokalizacji');
    console.log('5. 🔧 Konfiguracja reverse proxy (nginx/apache)');
    console.log('6. ☁️ Cloudflare lub inne CDN blokują ruch');
}

diagnoseProblem().catch(console.error);
