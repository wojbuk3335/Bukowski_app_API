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

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const response = await axios.post('http://localhost:3000/api/user/login', { email, password });
      if (response.data.success) {
        localStorage.setItem('role', response.data.role);
        if (response.data.role === 'user') {
          setAuth(response.data);
          navigate('/user/dashboard');
        } else {
          setError('Dostęp tylko dla użytkowników.');
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
      userType="user"
      panelName="PANEL UŻYTKOWNIKA"
      handleSubmit={handleSubmit}
      handleInputChange={handleInputChange}
      email={email}
      password={password}
      error={error}
      Logo={Logo}
      Icon={Icon}
    />
  );
};

export default UserLogin;