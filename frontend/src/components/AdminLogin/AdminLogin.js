import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Logo from '../../assets/images/bukowski_logo.png';
import AuthContext from '../../context/AuthProvider';
import AuthForm from '../AuthForm/AuthForm';
import userIcon from '../../assets/images/user.png';
import Icon from '../../assets/images/admin.png';

const AdminLogin = () => {
  const { setAuth } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('AdminToken');
    const role = localStorage.getItem('AdminRole');
    if (token && role === 'admin') {
      setAuth({ token, role });
      navigate('/admin/dashboard');
    }
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
      const response = await axios.post('http://localhost:3000/api/user/login', { email, password });
      if (response.data.success) {
        localStorage.setItem('AdminRole', response.data.role); // Store role in localStorage
        localStorage.setItem('AdminEmail', email); // Store email in localStorage
        if (response.data.role === 'admin') {
          setAuth(response.data); // Pass true and response.data to setAuth
          localStorage.setItem('AdminToken', response.data.token); // Always store token in localStorage
          navigate('/admin/dashboard');
        } else {
          setError('Dostęp tylko dla administratorów.');
        }
      } else {
        setError('Niepoprawne dane logowania.');
      }
    } catch (error) {
      setError('Wystąpił błąd podczas logowania.');
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