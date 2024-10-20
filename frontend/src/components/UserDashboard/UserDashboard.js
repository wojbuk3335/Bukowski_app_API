import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../../context/AuthProvider';
import styles from './UserDashboard.module.css';
import { useEffect } from 'react';

const UserDashboard = () => {
  const { auth, setAuth } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('UserToken') || sessionStorage.getItem('UserToken');
    const email = localStorage.getItem('UserEmail');
    const role = localStorage.getItem('UserRole');

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
    setAuth(null);
    navigate('/'); // Redirect to login page
  };

  return (
<div className={styles.userPanel}>
  <p className={styles.loginText}>PANEL UŻYTKOWNIKA-zalogowany jako <span className={styles.autTextEmail}>{auth.email}</span></p>
  <a href="#" onClick={handleLogout} className={styles.logoutButton}>Wyloguj</a>
</div>
  );
};

export default UserDashboard;