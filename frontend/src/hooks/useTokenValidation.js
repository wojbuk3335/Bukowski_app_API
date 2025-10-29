import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import tokenService from '../services/tokenService';

// Hook to validate token on route changes
const useTokenValidation = (requireAuth = true) => {
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const validateToken = async () => {
            if (!requireAuth) return;

            console.log(`🔍 Validating token for route: ${location.pathname}`);

            try {
                const isValid = await tokenService.validateTokenOnRouteChange();
                
                if (!isValid) {
                    console.log('🚪 Token invalid, redirecting to login');
                    navigate('/admin/login');
                }
            } catch (error) {
                console.log('🚪 Token validation error, redirecting to login');
                navigate('/admin/login');
            }
        };

        validateToken();
    }, [location.pathname, navigate, requireAuth]);
};

export default useTokenValidation;