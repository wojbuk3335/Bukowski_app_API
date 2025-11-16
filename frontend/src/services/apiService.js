import tokenService from './tokenService';

// API Service with automatic token management
class ApiService {
    constructor() {
        this.API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://bukowskiapp.pl';
    }

    // Enhanced fetch with automatic token handling
    async authenticatedFetch(url, options = {}) {
        try {
            // Get authenticated headers
            const authHeaders = await tokenService.getAuthHeaders();
            
            // Merge headers
            const headers = {
                ...authHeaders,
                ...options.headers
            };

            // Build full URL
            const fullUrl = url.startsWith('http') ? url : `${this.API_BASE_URL}${url}`;

            // Make request
            const response = await fetch(fullUrl, {
                ...options,
                headers
            });

            // Handle 401 specifically
            if (response.status === 401) {
                console.log('🔄 401 received, attempting token refresh...');
                
                try {
                    // Try to refresh token
                    await tokenService.refreshAccessToken();
                    
                    // Retry request with new token
                    const newAuthHeaders = await tokenService.getAuthHeaders();
                    const retryResponse = await fetch(fullUrl, {
                        ...options,
                        headers: {
                            ...newAuthHeaders,
                            ...options.headers
                        }
                    });

                    if (retryResponse.status === 401) {
                        // Still 401 after refresh, logout user
                        console.log('🚪 Still 401 after refresh, logging out');
                        tokenService.logout();
                        throw new Error('Authentication failed');
                    }

                    return retryResponse;
                } catch (refreshError) {
                    console.log('🚪 Token refresh failed, logging out');
                    tokenService.logout();
                    throw refreshError;
                }
            }

            return response;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Convenience methods
    async get(url, options = {}) {
        return this.authenticatedFetch(url, {
            method: 'GET',
            ...options
        });
    }

    async post(url, data, options = {}) {
        return this.authenticatedFetch(url, {
            method: 'POST',
            body: JSON.stringify(data),
            ...options
        });
    }

    async put(url, data, options = {}) {
        return this.authenticatedFetch(url, {
            method: 'PUT',
            body: JSON.stringify(data),
            ...options
        });
    }

    async delete(url, options = {}) {
        return this.authenticatedFetch(url, {
            method: 'DELETE',
            ...options
        });
    }

    // Get JSON response
    async getJson(url, options = {}) {
        const response = await this.get(url, options);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
    }

    async postJson(url, data, options = {}) {
        const response = await this.post(url, data, options);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
    }
}

// Create singleton instance
const apiService = new ApiService();

export default apiService;