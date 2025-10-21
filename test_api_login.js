const axios = require('axios');

console.log('🧪 Test API endpointu po aktualizacji serwera');
console.log('===========================================');

async function testLogin() {
    const testData = {
        email: 'w.bukowski1985@gmail.com',
        password: 'Jezusmoimpanem30!'
    };

    console.log(`📧 Email: ${testData.email}`);
    console.log(`🔑 Hasło: ${testData.password}`);
    console.log('');

    try {
        console.log('🚀 Wysyłanie żądania POST na https://bukowskiapp.pl/api/user/login...');
        
        const response = await axios.post('https://bukowskiapp.pl/api/user/login', testData, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 15000 // 15 sekund timeout
        });

        console.log('✅ SUKCES! Logowanie powiodło się!');
        console.log('📊 Status:', response.status);
        console.log('📋 Odpowiedź:');
        console.log(JSON.stringify(response.data, null, 2));

        if (response.data.token) {
            console.log('🎉 JWT Token otrzymany - logowanie działa poprawnie!');
        }

    } catch (error) {
        console.log('❌ BŁĄD podczas logowania:');
        
        if (error.response) {
            console.log('📊 Status HTTP:', error.response.status);
            console.log('📋 Odpowiedź serwera:');
            console.log(JSON.stringify(error.response.data, null, 2));
            
            if (error.response.status === 401) {
                console.log('🔍 Diagnoza: Problem z autoryzacją');
                console.log('   - Sprawdź czy hasło jest poprawne');
                console.log('   - Sprawdź czy serwer został zrestartowany');
                console.log('   - Sprawdź czy MongoDB jest dostępny');
            } else if (error.response.status === 429) {
                console.log('🔍 Diagnoza: Zbyt wiele żądań (rate limiting)');
                console.log('   - Poczekaj chwilę i spróbuj ponownie');
            } else if (error.response.status >= 500) {
                console.log('🔍 Diagnoza: Błąd serwera');
                console.log('   - Sprawdź logi serwera');
                console.log('   - Sprawdź połączenie z bazą danych');
            }
        } else if (error.code === 'ECONNREFUSED') {
            console.log('🔍 Diagnoza: Nie można połączyć się z serwerem');
            console.log('   - Serwer może być niedostępny');
            console.log('   - Sprawdź czy aplikacja działa na serwerze');
        } else if (error.code === 'ETIMEDOUT') {
            console.log('🔍 Diagnoza: Timeout połączenia');
            console.log('   - Serwer może być przeciążony');
            console.log('   - Sprawdź połączenie internetowe');
        } else {
            console.log('🔍 Nieznany błąd:', error.message);
        }
    }
}

testLogin();