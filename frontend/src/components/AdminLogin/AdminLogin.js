import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Logo from '../../assets/images/bukowski_logo.png';
import AuthContext from '../../context/AuthProvider';
import AuthForm from '../AuthForm/AuthForm';
import userIcon from '../../assets/images/user.png';
import Icon from '../../assets/images/admin.png';
import tokenService from '../../services/tokenService';

const AdminLogin = () => {
  const { setAuth } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkExistingAuth = async () => {
      const { accessToken } = tokenService.getTokens();
      const role = localStorage.getItem('AdminRole');
      
      if (accessToken && role === 'admin') {
        try {
          // Validate token before proceeding
          const isValid = await tokenService.validateTokenOnRouteChange();
          if (isValid) {
            setAuth({ token: accessToken, role });
            navigate('/admin/dashboard');
          }
        } catch (error) {
          // Token invalid, stay on login page
          console.log('Existing token invalid, user needs to login');
        }
      }
    };
    
    checkExistingAuth();
  }, [setAuth, navigate]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    if (name === 'email') {
      setEmail(value);
    } else if (name === 'password') {
      setPassword(value);
    }
  };

  const handleRememberMeChange = (event) => {
    setRememberMe(event.target.checked);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';
      
      // Send rememberMe flag to backend
      const response = await axios.post(`${API_BASE_URL}/api/user/login`, { 
        email, 
        password, 
        rememberMe 
      });
      
      if (response.data.success) {
        localStorage.setItem('AdminRole', response.data.role);
        localStorage.setItem('AdminEmail', email);
        localStorage.setItem('AdminRememberMe', rememberMe.toString()); // Store remember me preference
        
        if (response.data.role === 'admin') {
          // Store both access and refresh tokens
          tokenService.setTokens(
            response.data.accessToken || response.data.token, // Use accessToken if available, fallback to token
            response.data.refreshToken
          );
          
          // Configure activity monitor based on remember me
          tokenService.configureSessionType(rememberMe);
          
          setAuth(response.data);
          navigate('/admin/dashboard');
        } else {
          setError('Dostęp tylko dla administratorów.');
        }
      } else {
        setError('Niepoprawne dane logowania.');
      }
    } catch (error) {
      // Cicha obsługa błędów - bez logowania do konsoli
      if (error.response && error.response.status === 401) {
        setError('Niepoprawne dane logowania.');
      } else {
        setError('Wystąpił błąd podczas logowania.');
      }
    }
  };

  return (
    <AuthForm
      userType="admin"
      panelName="PANEL ADMINISTRACYJNY"
      handleSubmit={handleSubmit}
      handleInputChange={handleInputChange}
      email={email}
      password={password}
      error={error}
      rememberMe={rememberMe}
      handleRememberMeChange={handleRememberMeChange}
      Logo={Logo}
      userIcon={userIcon}
      Icon={Icon}
    />
  );
};

export default AdminLogin;