import React, { useEffect, useContext } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import AuthContext from '../../context/AuthProvider';
import styles from './AdminDashboard.module.css';
import Navigaton from './Nav/Navigaton';
import tokenService from '../../services/tokenService';
import useTokenValidation from '../../hooks/useTokenValidation';
import activityMonitor from '../../services/activityMonitor';

const AdminDashBoard = () => {
  const { auth, setAuth } = useContext(AuthContext);
  const navigate = useNavigate();
  
  // Validate token on every route change
  useTokenValidation(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const { accessToken } = tokenService.getTokens();
      const email = localStorage.getItem('AdminEmail');
      const role = localStorage.getItem('AdminRole');

      if (accessToken && role === 'admin') {
        try {
          // Validate token
          const isValid = await tokenService.validateTokenOnRouteChange();
          if (isValid) {
            setAuth({ email, token: accessToken, role });
            
            // 🕐 Start activity monitoring when user is authenticated
            console.log('🕐 Starting activity monitoring for admin dashboard');
            
            // Configure session based on remember me preference
            const rememberMe = localStorage.getItem('AdminRememberMe') === 'true';
            tokenService.configureSessionType(rememberMe);
            
            activityMonitor.startMonitoring();
          } else {
            navigate('/admin');
          }
        } catch (error) {
          navigate('/admin');
        }
      } else {
        navigate('/admin'); // Redirect to login if not authenticated
      }
    };

    initializeAuth();
    
    // Cleanup activity monitor on unmount
    return () => {
      activityMonitor.stopMonitoring();
    };
  }, [navigate, setAuth]);

  if (!auth) {
    return <div>Loading...</div>;
  }

  const handleLogout = async (e) => {
    e.preventDefault();
    
    // Stop activity monitoring
    activityMonitor.stopMonitoring();
    
    setAuth(null);
    await tokenService.logout(); // This will clear tokens and redirect
  };

  return (
    <div>
      <div className={styles.userPanel}>
        <p className={styles.loginText}>
          PANEL ADMINISTRACYJNY - zalogowany jako <span className={styles.autTextEmail}>{auth.email}</span>
        </p>
        <a href="#" onClick={handleLogout} className={`${styles.logoutButton} btn btn-sm`}>Wyloguj</a>
      </div> 
      <div>
        <Navigaton />
      </div>
      <div className={styles.outlet}>
        <Outlet />
      </div>
    </div>
  );
};

export default AdminDashBoard;