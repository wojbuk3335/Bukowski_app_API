import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Logo from '../../assets/images/bukowski_logo.png';
import AuthContext from '../../context/AuthProvider';
import AuthForm from '../AuthForm/AuthForm';
import Icon from '../../assets/images/user.png';

const UserLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false); // New state for loading
  const navigate = useNavigate();
  const { setAuth } = useContext(AuthContext);

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
    setLoading(true); // Set loading to true when the login process starts
    try {
      const response = await axios.post('/api/user/login', { email, password });
      if (response.data.success) {
        localStorage.setItem('UserRole', response.data.role); // Store role in localStorage
        localStorage.setItem('UserEmail', email); // Store email in localStorage
        localStorage.setItem('UserId', response.data.userId); // Store userId in localStorage
        localStorage.setItem('UserSymbol', response.data.symbol); // Store userSymbol in localStorage
        if (response.data.role === 'user') {
          setAuth(response.data);
          if (rememberMe) {
            localStorage.setItem('UserToken', response.data.token);
          } else {
            sessionStorage.setItem('UserToken', response.data.token);
          }
          navigate('/user/dashboard');
        } else {
          setError('Dostęp tylko dla użytkowników.');
        }
      } else {
        setError('Niepoprawne dane logowania.');
      }
    } catch (error) {
      setError('Wystąpił błąd podczas logowania.');
    } finally {
      setLoading(false); // Set loading to false when the login process ends
    }
  };

  return (
    <AuthForm
      userType="user"
      panelName="PANEL UŻYTKOWNIKA"
      handleSubmit={handleSubmit}
      handleInputChange={handleInputChange}
      email={email}
      password={password}
      error={error}
      rememberMe={rememberMe}
      handleRememberMeChange={handleRememberMeChange}
      Logo={Logo}
      Icon={Icon}
      loading={loading} // Pass loading state to AuthForm
    />
  );
};

export default UserLogin;