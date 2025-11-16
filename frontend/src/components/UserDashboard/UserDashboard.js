import React, { useContext, useEffect } from 'react';
import { useNavigate, Link, Outlet } from 'react-router-dom';
import AuthContext from '../../context/AuthProvider';
import styles from './UserDashboard.module.css';
import Navigaton from '../UserDashboard/Nav/Navigaton';

const UserDashboard = () => {
  const { auth, setAuth } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('UserToken') || sessionStorage.getItem('UserToken');
    const email = localStorage.getItem('UserEmail');
    const role = localStorage.getItem('UserRole');
    const userId = localStorage.getItem('UserId');
    const userSymbol = localStorage.getItem('UserSymbol');

    if (token && role === 'user') {
      setAuth({ email, token, role });
      console.log('Token found in:', localStorage.getItem('UserToken') ? 'localStorage' : 'sessionStorage');
    } else {
      navigate('/user'); // Redirect to login if not authenticated
    }
  }, [navigate, setAuth]);

  if (!auth) {
    return <div>Loading...</div>;
  }

  const handleLogout = (e) => {
    e.preventDefault();
    localStorage.removeItem('UserToken');
    sessionStorage.removeItem('UserToken');
    localStorage.removeItem('UserRole');
    localStorage.removeItem('UserEmail');
    localStorage.removeItem('UserId');
    localStorage.removeItem('UserSymbol');
    
    setAuth(null);
    navigate('/'); // Redirect to login page
  };

  return (
    <div>
      <div className={styles.userPanel}>
        <p className={styles.loginText}>
          PANEL UŻYTKOWNIKA - zalogowany jako <span className={styles.autTextEmail}>{auth.email}</span>
        </p>
        <a href="#" onClick={handleLogout} className={`${styles.logoutButton} btn btn-sm`}>Wyloguj</a>
      </div>
      <div>
        <Navigaton />
      </div>
      <div className={styles.userDashboardContent}>
        <Outlet />
      </div>
    </div>
  );
};

export default UserDashboard;