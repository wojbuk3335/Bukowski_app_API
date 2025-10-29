// Token Management Service with Auto-Refresh and Token Validation
class TokenService {
    constructor() {
        this.API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';
        this.refreshPromise = null; // Prevent multiple refresh requests
        this.isRefreshingToken = false;
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
            console.log('🔄 Token expiring, refreshing...');
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
            console.log('🚪 Token validation failed, redirecting to login');
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
                console.log('Server logout failed, continuing with local logout');
            }
        }

        this.clearTokens();
        window.location.href = '/admin';
    }

    // Configure session type based on "Remember Me"
    configureSessionType(rememberMe) {
        console.log(`🔐 Configuring session type: ${rememberMe ? 'Long-term' : 'Short-term'}`);
        localStorage.setItem('SessionType', rememberMe ? 'long' : 'short');
        
        // Configure activity monitor
        import('./activityMonitor').then(module => {
            if (rememberMe) {
                // 🔒 PRODUKCJA: Long session: 4 godziny inactivity timeout
                module.default.setInactivityTimeout(4 * 60 * 60 * 1000, 3.5 * 60 * 60 * 1000);
                console.log('⏱️ PRODUKCJA Long session: 4 godziny inactivity timeout set');
            } else {
                // 🔒 PRODUKCJA: Short session: 30 minut inactivity timeout  
                module.default.setInactivityTimeout(30 * 60 * 1000, 25 * 60 * 1000);
                console.log('⏱️ PRODUKCJA Short session: 30 minut inactivity timeout set');
            }
        }).catch(error => {
            console.error('Error configuring activity monitor:', error);
        });
    }

    // Start periodic token check (production timing)
    startTokenMonitoring() {
        setInterval(async () => {
            const { accessToken } = this.getTokens();
            
            if (accessToken && this.isTokenExpiring(accessToken, 2)) { // 2 minutes buffer for production
                console.log('🕐 Proactive token refresh triggered');
                try {
                    await this.getValidAccessToken();
                } catch (error) {
                    console.log('🚪 Proactive refresh failed, user will be logged out');
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