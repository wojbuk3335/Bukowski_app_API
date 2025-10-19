const axios = require('axios');

// 🗃️ TESTY BEZPIECZEŃSTWA BAZY DANYCH
const BASE_URL = 'http://localhost:3000/api';

async function testDatabaseSecurity() {
    console.log('🗃️ TESTOWANIE BEZPIECZEŃSTWA BAZY DANYCH...\n');

    // Najpierw uzyskajmy token
    let authToken = null;
    try {
        const loginResponse = await axios.post(`${BASE_URL}/user/login`, {
            email: 'admin@bukowski.com',
            password: 'SecurePass123!'
        });
        authToken = loginResponse.data.token;
        console.log('✅ Uzyskano token autoryzacyjny');
    } catch (error) {
        console.log('❌ Nie można uzyskać tokena - testy ograniczone');
    }

    // Test 1: NoSQL Injection w parametrach URL
    console.log('\n📋 TEST 1: NoSQL Injection w URL');
    const injectionUrls = [
        '/goods/{"$ne": null}',
        '/goods/{"$where": "this.price < 100"}',
        '/sales/{"$regex": ".*"}',
        '/bags/{"$gt": ""}'
    ];

    for (const url of injectionUrls) {
        try {
            const response = await axios.get(`${BASE_URL}${url}`, {
                headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
            });
            console.log(`❌ PROBLEM: Injection w URL "${url}" może działać!`);
        } catch (error) {
            if (error.response?.status === 400 || error.response?.status === 404) {
                console.log(`✅ POPRAWNE: URL injection "${url}" został zablokowany`);
            } else {
                console.log(`   Status ${error.response?.status} dla: ${url}`);
            }
        }
    }

    // Test 2: NoSQL Injection w body requestu
    console.log('\n📋 TEST 2: NoSQL Injection w danych POST');
    const injectionPayloads = [
        { email: {"$ne": null}, password: "any" },
        { email: {"$regex": ".*admin.*"}, password: "test" },
        { search: {"$where": "return true"} },
        { filter: {"$gt": ""} }
    ];

    for (const payload of injectionPayloads) {
        try {
            const response = await axios.post(`${BASE_URL}/user/login`, payload);
            console.log(`❌ PROBLEM: POST injection może działać!`, payload);
        } catch (error) {
            if (error.response?.status === 400) {
                console.log(`✅ POPRAWNE: POST injection został zablokowany`);
            } else if (error.response?.status === 401) {
                console.log(`✅ POPRAWNE: Unauthorized (dane zostały zwalidowane)`);
            }
        }
    }

    // Test 3: MongoDB ObjectId validation
    console.log('\n📋 TEST 3: ObjectId Validation');
    const invalidIds = [
        'invalid-id',
        '123',
        'null',
        '{"$ne": null}',
        '../../../etc/passwd',
        'xxxxxxxxxx'
    ];

    for (const invalidId of invalidIds) {
        try {
            const response = await axios.get(`${BASE_URL}/goods/${invalidId}`, {
                headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
            });
            console.log(`❌ PROBLEM: Invalid ObjectId "${invalidId}" został zaakceptowany!`);
        } catch (error) {
            if (error.response?.status === 400) {
                console.log(`✅ POPRAWNE: Invalid ObjectId "${invalidId}" został odrzucony`);
            } else {
                console.log(`   Status ${error.response?.status} dla ID: ${invalidId}`);
            }
        }
    }

    // Test 4: Data sanitization
    console.log('\n📋 TEST 4: Sanitization XSS/HTML');
    if (authToken) {
        const xssPayloads = [
            '<script>alert("XSS")</script>',
            '"><img src=x onerror=alert("XSS")>',
            'javascript:alert("XSS")',
            '<iframe src="javascript:alert(\'XSS\')"></iframe>'
        ];

        for (const xssPayload of xssPayloads) {
            try {
                const response = await axios.post(`${BASE_URL}/goods`, {
                    name: xssPayload,
                    price: 100,
                    category: 'test'
                }, {
                    headers: { Authorization: `Bearer ${authToken}` }
                });
                
                // Sprawdź czy XSS został usunięty/escaped
                if (response.data.goods && response.data.goods.name.includes('<script>')) {
                    console.log(`❌ PROBLEM: XSS "${xssPayload}" nie został zescapowany!`);
                } else {
                    console.log(`✅ POPRAWNE: XSS został zescapowany lub zablokowany`);
                }
            } catch (error) {
                if (error.response?.status === 400) {
                    console.log(`✅ POPRAWNE: XSS payload został odrzucony`);
                }
            }
        }
    }

    console.log('\n🎯 TESTY BEZPIECZEŃSTWA BAZY DANYCH ZAKOŃCZONE!');
}

testDatabaseSecurity().catch(console.error);