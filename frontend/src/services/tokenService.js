// Token Management Service with Auto-Refresh and Token Validation
import axios from 'axios';

class TokenService {
    constructor() {
        this.API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://bukowskiapp.pl';
        this.refreshPromise = null; // Prevent multiple refresh requests
        this.isRefreshingToken = false;
        
        // 🔒 SETUP AXIOS INTERCEPTOR dla automatycznego dodawania tokenów
        this.setupAxiosInterceptors();

        // 🔁 UNIVERSAL FETCH WRAPPER - obsługuje WSZYSTKIE typy zapytań API w aplikacji
        if (typeof window !== 'undefined' && window.fetch && !window.__fetchWithAuthPatched) {
            const originalFetch = window.fetch.bind(window);
            window.__originalFetch = originalFetch;
            window.__fetchWithAuthPatched = true;

            window.fetch = async (input, init = {}) => {
                try {
                    // Normalize URL string
                    const url = typeof input === 'string' ? input : input.url;

                    // 🎯 UNIVERSALNE WYKRYWANIE ZAPYTAŃ API - wszystkie możliwe przypadki:
                    const isApiUrl = url && (
                        // 1. Relatywne URL: '/api/...'
                        url.startsWith('/api') ||
                        // 2. Absolutne URL do tego samego backendu: 'http://localhost:3000/api/...' lub 'https://bukowskiapp.pl/api/...'
                        url.includes('localhost:3000/api/') ||
                        url.includes('bukowskiapp.pl/api/') ||
                        // 3. URL z process.env.REACT_APP_API_BASE_URL + '/api/'
                        (this.API_BASE_URL && url.includes(this.API_BASE_URL + '/api/')) ||
                        // 4. Dowolny URL zawierający '/api/' (catch-all dla wszystkich możliwych backend URL)
                        (url.includes('/api/') && !url.includes('localhost:9100') && !url.includes('external-api'))
                    );

                    // ⚠️ SKIP tokenService for FormData requests - let proxy handle them
                    const isFormData = init && init.body instanceof FormData;
                    const needsAuth = isApiUrl && !isFormData;

                    if (needsAuth) {
                        // Ensure we have a valid token (this will refresh if needed)
                        try {
                            const token = await this.getValidAccessToken();
                            init = init || {};
                            init.headers = Object.assign({}, init.headers || {}, {
                                Authorization: `Bearer ${token}`,
                                'Content-Type': init.headers?.['Content-Type'] || 'application/json'
                            });
                        } catch (err) {
                            // If token retrieval/refresh fails, clear tokens and continue without header
                            this.clearTokens();
                            // Still continue the request - backend will return 401 and user will be redirected
                        }
                    }

                    return await originalFetch(input, init);
                } catch (err) {
                    return Promise.reject(err);
                }
            };
        }

        // 🔧 WRAPPER dla axios.create() - zapewnia że nowe instancje axios też mają interceptory
        if (typeof window !== 'undefined' && axios.create && !axios.__createWithAuthPatched) {
            const originalCreate = axios.create.bind(axios);
            axios.__originalCreate = originalCreate;
            axios.__createWithAuthPatched = true;

            axios.create = (config = {}) => {
                const instance = originalCreate(config);
                
                // Dodaj interceptory do nowej instancji
                instance.interceptors.request.use(
                    async (requestConfig) => {
                        try {
                            const token = await this.getValidAccessToken();
                            if (token) {
                                requestConfig.headers.Authorization = `Bearer ${token}`;
                            }
                        } catch (err) {
                            // Token unavailable, continue without auth
                        }
                        return requestConfig;
                    },
                    (error) => Promise.reject(error)
                );

                instance.interceptors.response.use(
                    (response) => response,
                    async (error) => {
                        const originalRequest = error.config;
                        if (error.response?.status === 401 && !originalRequest._retry) {
                            originalRequest._retry = true;
                            try {
                                const newToken = await this.refreshAccessToken();
                                if (newToken) {
                                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                                    return instance(originalRequest);
                                }
                            } catch (refreshError) {
                                this.clearTokens();
                                window.location.href = '/admin/login';
                            }
                        }
                        return Promise.reject(error);
                    }
                );

                return instance;
            };
        }
    }

    // 🔒 UNIWERSALNA konfiguracja axios interceptors - działa dla WSZYSTKICH instancji axios
    setupAxiosInterceptors() {
        // 🎯 WZMOCNIONY Request interceptor - dodaje token do każdego żądania
        axios.interceptors.request.use(
            async (config) => {
                try {
                    // 🚀 PROAKTYWNE pobieranie tokenu (z refresh jeśli potrzeba)
                    const token = await this.getValidAccessToken();
                    if (token) {
                        config.headers.Authorization = `Bearer ${token}`;
                    }
                } catch (err) {
                    // Jeśli nie ma tokenu lub refresh się nie udał, kontynuuj bez tokenu
                }
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        // Response interceptor - obsługuje wygasłe tokeny
        axios.interceptors.response.use(
            (response) => response,
            async (error) => {
                const originalRequest = error.config;
                
                if (error.response?.status === 401 && !originalRequest._retry) {
                    originalRequest._retry = true;
                    
        
                    
                    try {
                        const newToken = await this.refreshAccessToken();
                        if (newToken) {
                            originalRequest.headers.Authorization = `Bearer ${newToken}`;
                            return axios(originalRequest);
                        }
                    } catch (refreshError) {
                        this.clearTokens();
                        window.location.href = '/admin/login';
                        return Promise.reject(refreshError);
                    }
                }
                
                return Promise.reject(error);
            }
        );
    }

    // Get tokens from localStorage
    getTokens() {
        const accessToken = localStorage.getItem('AdminToken');
        const refreshToken = localStorage.getItem('AdminRefreshToken');
        return { accessToken, refreshToken };
    }

    // Store tokens in localStorage
    setTokens(accessToken, refreshToken) {

        
        if (accessToken) {
            localStorage.setItem('AdminToken', accessToken);
        }
        if (refreshToken) {
            localStorage.setItem('AdminRefreshToken', refreshToken);
        }
        
        // Also store expiry time for proactive refresh
        const payload = this.parseJWT(accessToken);
        if (payload && payload.exp) {
            localStorage.setItem('AdminTokenExpiry', payload.exp * 1000); // Convert to ms
        } else {
            console.warn('⚠️ Could not parse token expiry');
        }
    }

    // Clear all tokens
    clearTokens() {
        localStorage.removeItem('AdminToken');
        localStorage.removeItem('AdminRefreshToken');
        localStorage.removeItem('AdminTokenExpiry');
        localStorage.removeItem('AdminRole');
        localStorage.removeItem('AdminEmail');
    }

    // Parse JWT token to get payload
    parseJWT(token) {
        if (!token) return null;
        
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return null;
            
            const payload = parts[1];
            const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
            return JSON.parse(decoded);
        } catch (error) {
            console.error('Error parsing JWT:', error);
            return null;
        }
    }

    // Check if token is expired or will expire soon
    isTokenExpiring(token, bufferMinutes = 1) {
        const payload = this.parseJWT(token);
        if (!payload || !payload.exp) return true;
        
        const expiryTime = payload.exp * 1000; // Convert to ms
        const bufferTime = bufferMinutes * 60 * 1000; // Buffer in ms
        const now = Date.now();
        
        return now >= (expiryTime - bufferTime);
    }

    // Refresh access token using refresh token
    async refreshAccessToken() {
        // Prevent multiple refresh requests
        if (this.isRefreshingToken) {
            return this.refreshPromise;
        }

        this.isRefreshingToken = true;
        
        const { refreshToken } = this.getTokens();
        
        if (!refreshToken) {
            this.clearTokens();
            throw new Error('No refresh token available');
        }

        this.refreshPromise = this.performRefresh(refreshToken);
        
        try {
            const result = await this.refreshPromise;
            this.isRefreshingToken = false;
            return result;
        } catch (error) {
            this.isRefreshingToken = false;
            this.clearTokens();
            throw error;
        }
    }

    // Perform the actual refresh request
    async performRefresh(refreshToken) {
        const response = await fetch(`${this.API_BASE_URL}/api/user/refresh-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Token refresh failed');
        }

        const data = await response.json();
        
        // Store new access token (keep existing refresh token)
        this.setTokens(data.accessToken, refreshToken);
        
        return data.accessToken;
    }

    // Get valid access token (refresh if needed)
    async getValidAccessToken() {
        const { accessToken } = this.getTokens();
        
        if (!accessToken) {
            throw new Error('No access token available');
        }

        // Check if token is expiring soon
        if (this.isTokenExpiring(accessToken)) {
            return await this.refreshAccessToken();
        }

        return accessToken;
    }

    // Create authenticated headers for API requests
    async getAuthHeaders() {
        try {
            const token = await this.getValidAccessToken();
            return {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };
        } catch (error) {
            // Token refresh failed, redirect to login
            this.clearTokens();
            window.location.href = '/admin';
            throw error;
        }
    }

    // Check token validity on route changes
    async validateTokenOnRouteChange() {
        try {
            const { accessToken } = this.getTokens();
            
            if (!accessToken) {
                return false; // No token
            }

            // Try to get a valid token (will refresh if needed)
            await this.getValidAccessToken();
            return true;
        } catch (error) {
            this.clearTokens();
            return false;
        }
    }

    // Manual logout
    async logout() {
        const { refreshToken } = this.getTokens();
        
        // Inform server about logout (best effort)
        if (refreshToken) {
            try {
                await fetch(`${this.API_BASE_URL}/api/user/logout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ refreshToken })
                });
            } catch (error) {
                // Server logout failed, continuing with local logout
            }
        }

        this.clearTokens();
        window.location.href = '/admin';
    }

    // Configure session type based on "Remember Me"
    configureSessionType(rememberMe) {
        localStorage.setItem('SessionType', rememberMe ? 'long' : 'short');
        
        // Configure activity monitor
        import('./activityMonitor').then(module => {
            if (rememberMe) {
                // 🔒 PRODUKCJA: Long session: 4 godziny inactivity timeout
                module.default.setInactivityTimeout(4 * 60 * 60 * 1000, 3.5 * 60 * 60 * 1000);
            } else {
                // 🔒 PRODUKCJA: Short session: 30 minut inactivity timeout  
                module.default.setInactivityTimeout(30 * 60 * 1000, 25 * 60 * 1000);
            }
        }).catch(error => {
            // Error configuring activity monitor
        });
    }

    // Start periodic token check (production timing)
    startTokenMonitoring() {
        setInterval(async () => {
            const { accessToken } = this.getTokens();
            
            if (accessToken && this.isTokenExpiring(accessToken, 2)) { // 2 minutes buffer for production
                try {
                    await this.getValidAccessToken();
                } catch (error) {
                    // Proactive refresh failed, user will be logged out
                }
            }
        }, 60000); // 🔒 PRODUKCJA: Check every minute
    }
}

// Create singleton instance
const tokenService = new TokenService();

// Auto-start monitoring when service is loaded
if (typeof window !== 'undefined') {
    tokenService.startTokenMonitoring();
}

export default tokenService;