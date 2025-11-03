import axios from 'axios';

let isRedirecting = false; // 🔒 Zabezpieczenie przed wielokrotnym przekierowaniem

// 🔒 GLOBALNY INTERCEPTOR DLA AUTOMATYCZNEGO WYLOGOWANIA  
const setupAxiosInterceptors = (navigate) => {

  // 🔒 REQUEST INTERCEPTOR - Automatycznie dodaje token do każdego żądania
  axios.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('AdminToken') || localStorage.getItem('UserToken');
      console.log('🔒 Request interceptor - Token:', token ? 'FOUND' : 'NOT FOUND');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('🔒 Added Authorization header');
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor - łapie błędy 401
  axios.interceptors.response.use(
    (response) => {
      // Jeśli żądanie przeszło pomyślnie, zwróć response
      return response;
    },
    (error) => {
      // Sprawdź czy błąd to 401 Unauthorized
      if (error.response && error.response.status === 401 && !isRedirecting) {
        console.log('🔒 Token wygasł - automatyczne wylogowanie');
        
        // Sprawdź czy to nie jest żądanie logowania (żeby nie tworzyć pętli)
        if (error.config?.url && !error.config.url.includes('/login')) {
          isRedirecting = true; // Zablokuj kolejne przekierowania
          
          // Wyczyść localStorage
          localStorage.removeItem('AdminToken');
          localStorage.removeItem('AdminRole');  
          localStorage.removeItem('AdminEmail');
          localStorage.removeItem('UserToken');
          localStorage.removeItem('UserRole');
          localStorage.removeItem('UserEmail');
          
          // Wyczyść sessionStorage
          sessionStorage.clear();
          
          // Przekieruj bez alertu
          setTimeout(() => {
            if (navigate) {
              navigate('/admin');
            } else {
              window.location.href = '/admin';
            }
            isRedirecting = false; // Reset flagi po przekierowaniu
          }, 100);
        }
      }
      
      // Zwróć błąd dalej
      return Promise.reject(error);
    }
  );
};

export default setupAxiosInterceptors;
