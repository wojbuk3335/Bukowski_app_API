const axios = require('axios');

// 🔍 KOMPLETNY AUDIT BEZPIECZEŃSTWA - SZUKANIE NIEZABEZPIECZONYCH ENDPOINTÓW
const BASE_URL = 'http://localhost:3000/api';

async function comprehensiveSecurityAudit() {
    console.log('🔍 KOMPLEKSOWY AUDIT BEZPIECZEŃSTWA...\n');
    
    const unprotectedEndpoints = [];
    const securityIssues = [];

    // === 1. NIEZABEZPIECZONE ENDPOINTY - TEST DOSTĘPU BEZ TOKENA ===
    console.log('📋 TEST 1: Sprawdzanie niezabezpieczonych endpointów...');
    
    const suspiciousEndpoints = [
        // User endpoints
        '/user/signup',                    // Publiczny - OK
        '/user/login',                     // Publiczny - OK  
        '/user/refresh-token',             // Publiczny - OK
        
        // Sales endpoints - PODEJRZANE!
        '/sales',                          // ❌ NIEZABEZPIECZONY!
        '/sales/filter-by-date-and-point', // ❌ NIEZABEZPIECZONY!
        '/sales/save-sales',               // ❌ NIEZABEZPIECZONY!
        '/sales/insert-many-sales',        // ❌ NIEZABEZPIECZONY!
        
        // Goods endpoints - PODEJRZANE!
        '/goods/create-goods',             // ❌ NIEZABEZPIECZONY!
        '/goods/get-all-goods',            // ❌ NIEZABEZPIECZONY!
        '/goods/sync-product-names',       // ❌ NIEZABEZPIECZONY!
        
        // Warehouse endpoints - PODEJRZANE!
        '/warehouse/move-to-user',         // ❌ NIEZABEZPIECZONY!
        '/warehouse/report',               // ❌ NIEZABEZPIECZONY!
        '/warehouse/inventory',            // ❌ NIEZABEZPIECZONY!
        
        // User management - PODEJRZANE!
        '/user',                           // ❓ Lista użytkowników
        
        // Test endpoint
        '/deductions/test'                 // Test endpoint - OK
    ];

    for (const endpoint of suspiciousEndpoints) {
        try {
            const response = await axios.get(`${BASE_URL}${endpoint}`, {
                validateStatus: () => true,
                timeout: 3000
            });
            
            if (response.status === 200) {
                console.log(`❌ NIEZABEZPIECZONY: ${endpoint} (Status: ${response.status})`);
                unprotectedEndpoints.push({
                    endpoint,
                    method: 'GET', 
                    status: response.status,
                    severity: 'HIGH'
                });
            } else if (response.status === 401) {
                console.log(`✅ ZABEZPIECZONY: ${endpoint} (Status: ${response.status})`);
            } else {
                console.log(`⚠️ INNY STATUS: ${endpoint} (Status: ${response.status})`);
            }
        } catch (error) {
            if (error.response?.status === 401) {
                console.log(`✅ ZABEZPIECZONY: ${endpoint} (401 Unauthorized)`);
            } else if (error.response?.status === 404) {
                console.log(`   BRAK ENDPOINTU: ${endpoint} (404)`);
            } else {
                console.log(`   ERROR: ${endpoint} (${error.code || error.response?.status})`);
            }
        }
    }

    // === 2. TEST POST ENDPOINTÓW BEZ AUTORYZACJI ===
    console.log('\n📋 TEST 2: POST endpoints bez autoryzacji...');
    
    const postEndpoints = [
        { url: '/sales/save-sales', payload: { testData: 'unauthorized' } },
        { url: '/goods/create-goods', payload: { name: 'Test Product', price: 100 } },
        { url: '/sales/insert-many-sales', payload: [{ testSale: 'data' }] },
        { url: '/warehouse/move-to-user', payload: { userId: 'test', items: [] } }
    ];

    for (const { url, payload } of postEndpoints) {
        try {
            const response = await axios.post(`${BASE_URL}${url}`, payload, {
                validateStatus: () => true,
                timeout: 3000
            });
            
            if (response.status === 200 || response.status === 201) {
                console.log(`❌ NIEZABEZPIECZONY POST: ${url} (Status: ${response.status})`);
                unprotectedEndpoints.push({
                    endpoint: url,
                    method: 'POST',
                    status: response.status,
                    severity: 'CRITICAL'
                });
            } else if (response.status === 401) {
                console.log(`✅ ZABEZPIECZONY POST: ${url} (Status: ${response.status})`);
            } else {
                console.log(`⚠️ POST STATUS: ${url} (Status: ${response.status})`);
            }
        } catch (error) {
            if (error.response?.status === 401) {
                console.log(`✅ ZABEZPIECZONY POST: ${url} (401)`);
            } else {
                console.log(`   POST ERROR: ${url} (${error.code || error.response?.status})`);
            }
        }
    }

    // === 3. TEST NIEBEZPIECZNYCH OPERACJI ===
    console.log('\n📋 TEST 3: Niebezpieczne operacje...');
    
    const dangerousOperations = [
        { method: 'DELETE', url: '/sales/delete-all-sales' },    // ADMIN ONLY
        { method: 'DELETE', url: '/bags/delete-all-bags' },      // Should be ADMIN
        { method: 'DELETE', url: '/deductions/all' },            // Very dangerous
        { method: 'DELETE', url: '/user/123' },                  // User deletion
    ];

    for (const { method, url } of dangerousOperations) {
        try {
            const response = await axios.request({
                method: method.toLowerCase(),
                url: `${BASE_URL}${url}`,
                validateStatus: () => true,
                timeout: 3000
            });
            
            if (response.status === 200) {
                console.log(`❌ NIEBEZPIECZNE: ${method} ${url} (Status: ${response.status})`);
                securityIssues.push({
                    operation: `${method} ${url}`,
                    issue: 'Dangerous operation without proper protection',
                    severity: 'CRITICAL'
                });
            } else if (response.status === 401 || response.status === 403) {
                console.log(`✅ CHRONIONE: ${method} ${url} (Status: ${response.status})`);
            } else {
                console.log(`⚠️ ${method} STATUS: ${url} (Status: ${response.status})`);
            }
        } catch (error) {
            if (error.response?.status === 401 || error.response?.status === 403) {
                console.log(`✅ CHRONIONE: ${method} ${url}`);
            } else {
                console.log(`   ERROR: ${method} ${url} (${error.code})`);
            }
        }
    }

    // === 4. PODSUMOWANIE ===
    console.log('\n🎯 PODSUMOWANIE AUDYTU BEZPIECZEŃSTWA:');
    console.log('================================================');
    
    if (unprotectedEndpoints.length > 0) {
        console.log(`❌ ZNALEZIONE NIEZABEZPIECZONE ENDPOINTY: ${unprotectedEndpoints.length}`);
        unprotectedEndpoints.forEach(endpoint => {
            console.log(`   • ${endpoint.method} ${endpoint.endpoint} (${endpoint.severity})`);
        });
    } else {
        console.log('✅ WSZYSTKIE ENDPOINTY SĄ ZABEZPIECZONE');
    }

    if (securityIssues.length > 0) {
        console.log(`\n⚠️ PROBLEMY BEZPIECZEŃSTWA: ${securityIssues.length}`);
        securityIssues.forEach(issue => {
            console.log(`   • ${issue.operation}: ${issue.issue}`);
        });
    }

    // === 5. REKOMENDACJE ===
    console.log('\n💡 REKOMENDACJE:');
    if (unprotectedEndpoints.length > 0) {
        console.log('1. ❌ Dodaj checkAuth middleware do wszystkich niezabezpieczonych endpointów');
        console.log('2. ❌ Dodaj walidację ról (roleAuth) do operacji finansowych i administracyjnych');
        console.log('3. ❌ Dodaj input validation do wszystkich endpointów POST/PUT/PATCH');
    } else {
        console.log('✅ Podstawowe zabezpieczenia są na miejscu!');
    }
    
    console.log('4. ⚠️ Rozważ dodanie rate limiting per endpoint');
    console.log('5. ⚠️ Dodaj logging wszystkich operacji na danych wrażliwych');
    console.log('6. ⚠️ Implementuj audit trail dla zmian w danych');

    return { unprotectedEndpoints, securityIssues };
}

comprehensiveSecurityAudit().catch(console.error);