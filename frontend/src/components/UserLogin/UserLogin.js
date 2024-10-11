import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Logo from '../../assets/images/bukowski_logo.png';
import styles from './UserLogin.module.css';

const UserLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    if (name === 'email') {
      setEmail(value);
    } else if (name === 'password') {
      setPassword(value);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const response = await axios.post('http://localhost:3000/api/user/login', { email, password });
      if (response.data.success) {
        navigate('/user/dashboard');
      } else {
        setError('Invalid credentials');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    }
  };

  return (
    <div className="auth-inner">
      <form onSubmit={handleSubmit}>
        <div className={styles.logo}>
          <img src={Logo} alt="Logo" className={styles.logoWidth} />
        </div>

        <div className="mb-3">
          <label>Adres Email</label>
          <input
            type="email"
            className="form-control"
            placeholder="Enter email"
            name="email"
            value={email}
            onChange={handleInputChange}
          />
        </div>

        <div className="mb-3">
          <label>Hasło</label>
          <input
            type="password"
            className="form-control"
            placeholder="Enter password"
            name="password"
            value={password}
            onChange={handleInputChange}
          />
        </div>

        <div className="mb-3">
          <div className="custom-control custom-checkbox">
            <input
              type="checkbox"
              className={`custom-control-input ${styles.checkboxInput}`}
              id="customCheck1"
            />
            <label
              className={`custom-control-label ${styles.checkboxLabel}`}
              htmlFor="customCheck1"
            >
              Zapamiętaj mnie
            </label>
          </div>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <div className="d-grid">
          <button type="submit" className="btn btn-primary">
            Zaloguj
          </button>
        </div>
        <p className="forgot-password text-center">
          Zapomniałeś <a href="#">hasła?</a>
        </p>
        <p className={styles.place_of_login}>PANEL UŻYTKOWNIKA</p>
      </form>
    </div>
  );
};

export default UserLogin;