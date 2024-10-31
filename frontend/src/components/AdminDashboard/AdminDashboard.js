import React, { useEffect, useContext } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import AuthContext from '../../context/AuthProvider';
import styles from './AdminDashboard.module.css';
import Navigaton from './Nav/Navigaton';

const AdminDashBoard = () => {
  const { auth, setAuth } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('AdminToken') || sessionStorage.getItem('AdminToken');
    const email = localStorage.getItem('AdminEmail');
    const role = localStorage.getItem('AdminRole');

    if (token && role === 'admin') {
      setAuth({ email, token, role });
      console.log('Token found in:', localStorage.getItem('AdminToken') ? 'localStorage' : 'sessionStorage');
    } else {
      navigate('/admin'); // Redirect to login if not authenticated
    }
  }, [navigate, setAuth]);

  if (!auth) {
    return <div>Loading...</div>;
  }

  const handleLogout = (e) => {
    e.preventDefault();
    localStorage.removeItem('AdminToken');
    sessionStorage.removeItem('AdminToken');
    localStorage.removeItem('AdminRole');
    localStorage.removeItem('AdminEmail');
    setAuth(null);
    navigate('/'); // Redirect to login page
  };

  return (
    <div>
      <div className={styles.userPanel}>
        <p className={styles.loginText}>
          PANEL ADMINISTRACYJNY - zalogowany jako <span className={styles.autTextEmail}>{auth.email}</span>
        </p>
        <a href="#" onClick={handleLogout} className={styles.logoutButton}>Wyloguj</a>
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