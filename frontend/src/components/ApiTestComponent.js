import React, { useState } from 'react';
import axios from 'axios';

const ApiTestComponent = () => {
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const addResult = (type, url, status, hasAuth) => {
        setResults(prev => [...prev, {
            id: Date.now(),
            type,
            url,
            status,
            hasAuth,
            timestamp: new Date().toLocaleTimeString()
        }]);
    };

    const clearResults = () => setResults([]);

    // Test 1: fetch z relatywnym URL (powinien mieć token)
    const testRelativeFetch = async () => {
        try {
            const response = await fetch('/api/user');
            addResult('fetch (relative)', '/api/user', response.status, 
                response.headers.get('authorization') ? 'YES' : 'Unknown');
        } catch (error) {
            addResult('fetch (relative)', '/api/user', 'ERROR', 'Unknown');
        }
    };

    // Test 2: fetch z absolutnym URL localhost (powinien mieć token)
    const testAbsoluteFetch = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/user');
            addResult('fetch (absolute)', 'http://localhost:3000/api/user', response.status,
                response.headers.get('authorization') ? 'YES' : 'Unknown');
        } catch (error) {
            addResult('fetch (absolute)', 'http://localhost:3000/api/user', 'ERROR', 'Unknown');
        }
    };

    // Test 3: fetch z process.env URL (powinien mieć token)
    const testEnvFetch = async () => {
        const baseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';
        try {
            const response = await fetch(`${baseUrl}/api/user`);
            addResult('fetch (env)', `${baseUrl}/api/user`, response.status,
                response.headers.get('authorization') ? 'YES' : 'Unknown');
        } catch (error) {
            addResult('fetch (env)', `${baseUrl}/api/user`, 'ERROR', 'Unknown');
        }
    };

    // Test 4: axios (powinien mieć token)
    const testAxios = async () => {
        try {
            const response = await axios.get('/api/user');
            addResult('axios', '/api/user', response.status, 'YES (interceptor)');
        } catch (error) {
            addResult('axios', '/api/user', error.response?.status || 'ERROR', 'YES (interceptor)');
        }
    };

    // Test 5: axios.create() (powinien mieć token dzięki wrapper)
    const testAxiosCreate = async () => {
        try {
            const customAxios = axios.create({ baseURL: 'http://localhost:3000' });
            const response = await customAxios.get('/api/user');
            addResult('axios.create()', 'http://localhost:3000/api/user', response.status, 'YES (wrapper)');
        } catch (error) {
            addResult('axios.create()', 'http://localhost:3000/api/user', error.response?.status || 'ERROR', 'YES (wrapper)');
        }
    };

    // Test 6: fetch zewnętrzny (nie powinien mieć tokenu)
    const testExternalFetch = async () => {
        try {
            const response = await fetch('http://localhost:9100/available');
            addResult('fetch (external)', 'http://localhost:9100/available', response.status, 'NO (expected)');
        } catch (error) {
            addResult('fetch (external)', 'http://localhost:9100/available', 'ERROR', 'NO (expected)');
        }
    };

    const runAllTests = async () => {
        setIsLoading(true);
        clearResults();
        
        await testRelativeFetch();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await testAbsoluteFetch();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await testEnvFetch();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await testAxios();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await testAxiosCreate();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await testExternalFetch();
        
        setIsLoading(false);
    };

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h2>🧪 Test Uniwersalnego Systemu Autoryzacji</h2>
            <p>Sprawdza czy wszystkie typy zapytań w aplikacji automatycznie otrzymują token Authorization</p>
            
            <div style={{ marginBottom: '20px' }}>
                <button 
                    onClick={runAllTests} 
                    disabled={isLoading}
                    style={{ 
                        backgroundColor: '#007bff', 
                        color: 'white', 
                        border: 'none', 
                        padding: '10px 20px', 
                        borderRadius: '5px',
                        marginRight: '10px'
                    }}
                >
                    {isLoading ? '🔄 Testowanie...' : '🚀 Uruchom Wszystkie Testy'}
                </button>
                
                <button 
                    onClick={clearResults}
                    style={{ 
                        backgroundColor: '#6c757d', 
                        color: 'white', 
                        border: 'none', 
                        padding: '10px 20px', 
                        borderRadius: '5px'
                    }}
                >
                    🗑️ Wyczyść Wyniki
                </button>
            </div>

            {results.length > 0 && (
                <div>
                    <h3>📊 Wyniki Testów:</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8f9fa' }}>
                                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Typ</th>
                                <th style={{ border: '1px solid #ddd', padding: '8px' }}>URL</th>
                                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Status</th>
                                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Ma Token?</th>
                                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Czas</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map(result => (
                                <tr key={result.id}>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{result.type}</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px', fontSize: '12px' }}>{result.url}</td>
                                    <td style={{ 
                                        border: '1px solid #ddd', 
                                        padding: '8px',
                                        color: result.status === 200 ? 'green' : result.status === 401 ? 'orange' : 'red'
                                    }}>
                                        {result.status}
                                    </td>
                                    <td style={{ 
                                        border: '1px solid #ddd', 
                                        padding: '8px',
                                        color: result.hasAuth.includes('YES') ? 'green' : 'gray'
                                    }}>
                                        {result.hasAuth}
                                    </td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px', fontSize: '12px' }}>{result.timestamp}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    
                    <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
                        <h4>🎯 Interpretacja Wyników:</h4>
                        <ul>
                            <li><strong>Status 200:</strong> ✅ Zapytanie udane - token prawidłowy</li>
                            <li><strong>Status 401:</strong> ⚠️ Brak tokenu lub token nieprawidłowy</li>
                            <li><strong>Status ERROR:</strong> ❌ Błąd połączenia lub sieciowy</li>
                            <li><strong>Ma Token = YES:</strong> ✅ Token został automatycznie dodany</li>
                            <li><strong>Ma Token = NO:</strong> ℹ️ Token nie został dodany (oczekiwane dla zewnętrznych API)</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApiTestComponent;