const axios = require('axios');

// 🚀 TESTY WYDAJNOŚCI I OBCIĄŻENIA
const BASE_URL = 'http://localhost:3000/api';

async function testPerformanceAndStress() {
    console.log('🚀 TESTOWANIE WYDAJNOŚCI I OBCIĄŻENIA...\n');

    // Test 1: Response time test
    console.log('📋 TEST 1: Czasy odpowiedzi');
    const endpoints = [
        '/user/login',
        '/goods',
        '/sales', 
        '/bags',
        '/warehouse'
    ];

    for (const endpoint of endpoints) {
        const startTime = Date.now();
        try {
            const response = await axios.get(`${BASE_URL}${endpoint}`, {
                validateStatus: () => true
            });
            const responseTime = Date.now() - startTime;
            
            if (responseTime < 100) {
                console.log(`✅ ${endpoint}: ${responseTime}ms (SZYBKO)`);
            } else if (responseTime < 500) {
                console.log(`⚠️ ${endpoint}: ${responseTime}ms (ŚREDNIO)`);
            } else {
                console.log(`❌ ${endpoint}: ${responseTime}ms (WOLNO)`);
            }
        } catch (error) {
            const responseTime = Date.now() - startTime;
            console.log(`   ${endpoint}: ${responseTime}ms (ERROR: ${error.response?.status || error.code})`);
        }
    }

    // Test 2: Concurrent requests test
    console.log('\n📋 TEST 2: Równoczesne żądania');
    const concurrentRequests = 10;
    const promises = [];

    const startTime = Date.now();
    for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
            axios.get(`${BASE_URL}/goods`, {
                validateStatus: () => true
            }).catch(error => ({
                error: true,
                status: error.response?.status || 500
            }))
        );
    }

    const results = await Promise.all(promises);
    const totalTime = Date.now() - startTime;
    
    const successful = results.filter(r => !r.error && r.status === 200).length;
    const failed = results.filter(r => r.error || r.status !== 200).length;
    
    console.log(`   📊 ${concurrentRequests} równoczesnych żądań w ${totalTime}ms`);
    console.log(`   ✅ Udane: ${successful}`);
    console.log(`   ❌ Nieudane: ${failed}`);
    
    if (successful >= concurrentRequests * 0.8) {
        console.log(`   ✅ POPRAWNE: ${(successful/concurrentRequests*100).toFixed(0)}% success rate`);
    } else {
        console.log(`   ⚠️ UWAGA: Tylko ${(successful/concurrentRequests*100).toFixed(0)}% success rate`);
    }

    // Test 3: Memory usage simulation
    console.log('\n📋 TEST 3: Test pamięci (duże payload)');
    const sizes = [
        { name: '1KB', size: 1024 },
        { name: '10KB', size: 10 * 1024 },
        { name: '100KB', size: 100 * 1024 },
        { name: '1MB', size: 1024 * 1024 }
    ];

    for (const testSize of sizes) {
        const largeData = 'x'.repeat(testSize.size);
        const startTime = Date.now();
        
        try {
            const response = await axios.post(`${BASE_URL}/user/login`, {
                email: 'test@test.com',
                password: 'test123',
                extraData: largeData
            }, {
                timeout: 5000
            });
            
            const responseTime = Date.now() - startTime;
            console.log(`❌ PROBLEM: ${testSize.name} payload został zaakceptowany w ${responseTime}ms`);
            
        } catch (error) {
            const responseTime = Date.now() - startTime;
            if (error.code === 'ECONNRESET' || error.response?.status === 413) {
                console.log(`✅ POPRAWNE: ${testSize.name} payload odrzucony w ${responseTime}ms`);
            } else if (error.code === 'ECONNABORTED') {
                console.log(`✅ POPRAWNE: ${testSize.name} timeout w ${responseTime}ms`);
            } else {
                console.log(`   ${testSize.name}: Status ${error.response?.status || error.code} w ${responseTime}ms`);
            }
        }
    }

    // Test 4: Rate limiting stress test
    console.log('\n📋 TEST 4: Stress test rate limiting');
    let rateLimitHit = false;
    let requestCount = 0;
    
    for (let i = 0; i < 20; i++) {
        try {
            const response = await axios.post(`${BASE_URL}/user/login`, {
                email: 'stress@test.com',
                password: 'wrong'
            });
            requestCount++;
        } catch (error) {
            requestCount++;
            if (error.response?.status === 429) {
                rateLimitHit = true;
                console.log(`✅ POPRAWNE: Rate limit aktywny po ${requestCount} żądaniach`);
                break;
            }
        }
        
        // Małe opóźnienie
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    if (!rateLimitHit) {
        console.log(`⚠️ UWAGA: Rate limit nie zadziałał po ${requestCount} żądaniach`);
    }

    console.log('\n🎯 TESTY WYDAJNOŚCI ZAKOŃCZONE!');
}

testPerformanceAndStress().catch(console.error);