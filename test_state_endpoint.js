// Test script to check current state endpoint
const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:3000/api';

// Test credentials - replace with real ones
const TEST_USER = {
    username: 'test_user', // zmień na właściwego użytkownika
    password: 'test_password' // zmień na właściwe hasło
};

async function testStateEndpoint() {
    try {
        console.log('🔐 Logowanie...');
        
        // 1. Login to get token
        const loginResponse = await fetch(`${API_BASE_URL}/user/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(TEST_USER)
        });
        
        if (!loginResponse.ok) {
            console.error('❌ Błąd logowania:', loginResponse.status);
            return;
        }
        
        const loginData = await loginResponse.json();
        const token = loginData.token;
        
        console.log('✅ Zalogowano pomyślnie');
        console.log('👤 Użytkownik:', loginData.user?.name || loginData.user?.username);
        console.log('📍 Punkt sprzedaży:', loginData.user?.symbol || loginData.user?.location);
        
        // 2. Get current state
        console.log('\n📦 Pobieranie stanu magazynowego...');
        
        const stateResponse = await fetch(`${API_BASE_URL}/state`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });
        
        if (!stateResponse.ok) {
            console.error('❌ Błąd pobierania stanu:', stateResponse.status);
            const errorText = await stateResponse.text();
            console.error('Szczegóły błędu:', errorText);
            return;
        }
        
        const stateData = await stateResponse.json();
        
        console.log('✅ Stan magazynowy pobrany pomyślnie');
        console.log('📊 Struktura odpowiedzi:', typeof stateData);
        
        let products = [];
        if (Array.isArray(stateData)) {
            products = stateData;
        } else if (stateData?.state_data && Array.isArray(stateData.state_data)) {
            products = stateData.state_data;
        } else {
            console.log('⚠️ Nieoczekiwana struktura danych:', Object.keys(stateData));
        }
        
        console.log(`📦 Liczba produktów na stanie: ${products.length}`);
        
        if (products.length > 0) {
            console.log('\n🏷️ Przykładowe produkty (pierwsze 5):');
            products.slice(0, 5).forEach((product, index) => {
                console.log(`${index + 1}. ${product.fullName || product.name || 'Nieznany'}`);
                console.log(`   Kod: ${product.code || product.barcode || 'Brak'}`);
                console.log(`   Rozmiar: ${product.size || 'Brak'}`);
                console.log(`   Cena: ${product.price || 'Brak'} PLN`);
                console.log('   ---');
            });
        } else {
            console.log('📭 Brak produktów na stanie dla tego użytkownika');
        }
        
    } catch (error) {
        console.error('❌ Błąd podczas testowania:', error.message);
    }
}

testStateEndpoint();