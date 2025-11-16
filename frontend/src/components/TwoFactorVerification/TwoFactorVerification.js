import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../../context/AuthProvider';
import { useContext } from 'react';
import tokenService from '../../services/tokenService';
import styles from '../AuthForm/AuthForm.module.css'; // Użyj tego samego CSS co AuthForm
import Logo from '../../assets/images/bukowski_logo.png';
import adminIcon from '../../assets/images/admin.png';

const TwoFactorVerification = () => {
  const { setAuth } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Pobierz dane z poprzedniego kroku logowania
  const { userId, email, rememberMe } = location.state || {};

  // Dodaj CSS animację dla spinnera
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);
  
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minut w sekundach
  const [canResend, setCanResend] = useState(false);
  
  const inputRefs = useRef([]);

  // Timer odliczający
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  // Przekieruj jeśli brak danych sesji
  useEffect(() => {
    if (!userId || !email) {
      navigate('/admin');
    }
  }, [userId, email, navigate]);

  // Formatowanie czasu
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleInputChange = (index, value) => {
    // Tylko cyfry
    if (!/^\d*$/.test(value)) return;

    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    // Auto-focus następne pole
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit gdy wszystkie pola wypełnione
    if (newCode.every(digit => digit !== '') && newCode.join('').length === 6) {
      handleSubmit(newCode.join(''));
    }
  };

  // Obsługa wklejania kodu
  const handlePaste = (e, index) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, ''); // Tylko cyfry
    
    if (pastedData.length === 6) {
      // Wklej cały 6-cyfrowy kod
      const newCode = pastedData.split('');
      setVerificationCode(newCode);
      
      // Focus na ostatnie pole
      inputRefs.current[5]?.focus();
      
      // Auto-submit
      setTimeout(() => {
        handleSubmit(pastedData);
      }, 100);
    } else if (pastedData.length > 0) {
      // Wklej dostępne cyfry od bieżącego indeksu
      const newCode = [...verificationCode];
      const availableSlots = 6 - index;
      const dataToInsert = pastedData.slice(0, availableSlots);
      
      for (let i = 0; i < dataToInsert.length; i++) {
        if (index + i < 6) {
          newCode[index + i] = dataToInsert[i];
        }
      }
      
      setVerificationCode(newCode);
      
      // Focus na następne wolne pole lub ostatnie
      const nextIndex = Math.min(index + dataToInsert.length, 5);
      inputRefs.current[nextIndex]?.focus();
      
      // Auto-submit jeśli kod kompletny
      if (newCode.every(digit => digit !== '') && newCode.join('').length === 6) {
        setTimeout(() => {
          handleSubmit(newCode.join(''));
        }, 100);
      }
    }
  };

  const handleKeyDown = (index, e) => {
    // Backspace - przejdź do poprzedniego pola
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    
    // Enter - submit
    if (e.key === 'Enter') {
      const fullCode = verificationCode.join('');
      if (fullCode.length === 6) {
        handleSubmit(fullCode);
      }
    }
  };

  const handleSubmit = async (code = null) => {
    const codeToVerify = code || verificationCode.join('');
    
    if (codeToVerify.length !== 6) {
      setError('Wprowadź pełny 6-cyfrowy kod weryfikacyjny');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://bukowskiapp.pl';
      
      const response = await axios.post(`${API_BASE_URL}/api/user/verify-2fa`, {
        userId,
        verificationCode: codeToVerify,
        rememberMe
      });

      if (response.data.success) {
        // Zapisz dane logowania
        localStorage.setItem('AdminRole', response.data.role);
        localStorage.setItem('AdminEmail', email);
        localStorage.setItem('AdminRememberMe', rememberMe?.toString() || 'false');
        
        // Konfiguruj tokeny i sesję - używaj tylko nowego systemu tokenów
        tokenService.setTokens(
          response.data.accessToken,
          response.data.refreshToken
        );
        
        tokenService.configureSessionType(rememberMe);
        
        setAuth(response.data);
        navigate('/admin/dashboard');
      } else {
        setError(response.data.message || 'Niepoprawny kod weryfikacyjny');
      }
    } catch (error) {
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else if (error.response?.status === 400) {
        setError('Niepoprawny kod weryfikacyjny');
      } else {
        setError('Wystąpił błąd podczas weryfikacji. Spróbuj ponownie.');
      }
    }

    setLoading(false);
  };

  const handleResendCode = async () => {
    if (!canResend) return;

    setLoading(true);
    setError('');

    try {
      const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://bukowskiapp.pl';
      
      const response = await axios.post(`${API_BASE_URL}/api/user/resend-2fa`, {
        userId
      });

      if (response.data.success) {
        setTimeLeft(300); // Reset timer na 5 minut
        setCanResend(false);
        setVerificationCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        setError('');
        // Opcjonalnie pokaż sukces
      } else {
        setError(response.data.message || 'Błąd wysyłania kodu');
      }
    } catch (error) {
      setError('Błąd podczas wysyłania nowego kodu');
    }

    setLoading(false);
  };

  const handleBackToLogin = () => {
    navigate('/admin');
  };

  return (
    <div className={styles.authWrapper}>
      <div className={styles.authInner}>
        {/* Logo */}
        <div className={styles.logo}>
          <img src={Logo} alt="Logo" className={styles.logoWidth} />
        </div>

        {/* Informacja o weryfikacji */}
        <div className="mb-4 text-center">
          <h3 style={{ color: '#fff', marginBottom: '15px', fontSize: '20px' }}>
            Weryfikacja dwuetapowa
          </h3>
          <p style={{ color: '#ccc', fontSize: '14px', marginBottom: '0' }}>
            Kod weryfikacyjny został wysłany na adres:<br />
            <strong style={{ color: '#fff' }}>{email}</strong>
          </p>
        </div>

        {/* Kod weryfikacyjny */}
        <div className="mb-3">
          <label style={{ color: '#fff', marginBottom: '15px', display: 'block' }}>
            Wprowadź 6-cyfrowy kod weryfikacyjny:
          </label>
          
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '20px'
          }}>
            {verificationCode.map((digit, index) => (
              <input
                key={index}
                ref={el => inputRefs.current[index] = el}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={(e) => handlePaste(e, index)}
                disabled={loading}
                className="form-control"
                style={{
                  width: '50px',
                  height: '50px',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  backgroundColor: '#000',
                  color: '#fff',
                  border: '1px solid #ccc'
                }}
                placeholder=""
                autoComplete="off"
              />
            ))}
          </div>
        </div>

        {/* Timer */}
        <div className="mb-3" style={{
          padding: '10px',
          backgroundColor: timeLeft > 60 ? '#28a745' : '#ffc107',
          borderRadius: '5px',
          textAlign: 'center'
        }}>
          <p style={{
            margin: '0',
            color: '#fff',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            {timeLeft > 0 ? (
              <>Kod wygaśnie za: <strong>{formatTime(timeLeft)}</strong></>
            ) : (
              'Kod wygasł'
            )}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="alert alert-danger mb-3">
            {error}
          </div>
        )}

        {/* Przyciski */}
        <div className="d-grid mb-3">
          <button
            onClick={() => handleSubmit()}
            disabled={loading || verificationCode.join('').length !== 6}
            className="btn btn-primary mb-2"
            style={{ 
              opacity: loading || verificationCode.join('').length !== 6 ? 0.6 : 1,
              position: 'relative'
            }}
          >
            {loading ? (
              <>
                <span style={{
                  display: 'inline-block',
                  width: '20px',
                  height: '20px',
                  border: '2px solid #ffffff40',
                  borderTop: '2px solid #ffffff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  marginRight: '8px'
                }}></span>
                Weryfikacja...
              </>
            ) : 'Zweryfikuj kod'}
          </button>

          <button
            onClick={handleResendCode}
            disabled={loading || !canResend}
            className="btn btn-outline-secondary mb-2"
            style={{ 
              opacity: loading || !canResend ? 0.6 : 1,
              borderColor: '#ccc',
              color: '#ccc'
            }}
          >
            {loading ? '◐ Wysyłanie...' : 'Wyślij nowy kod'}
          </button>

          <button
            onClick={handleBackToLogin}
            disabled={loading}
            className="btn btn-outline-light"
            style={{ 
              opacity: loading ? 0.6 : 1,
              fontSize: '14px'
            }}
          >
            ← Powrót do logowania
          </button>
        </div>

        {/* Info */}
        <div style={{
          fontSize: '12px',
          color: '#ccc',
          lineHeight: '1.4',
          textAlign: 'center',
          marginTop: '20px'
        }}>
          <p style={{ margin: '0 0 5px 0' }}>
            Nie otrzymałeś kodu? Sprawdź folder spam/junk.
          </p>
          <p style={{ margin: '0' }}>
            Jeśli nadal masz problemy, skontaktuj się z administratorem.
          </p>
        </div>

        {/* Panel title jak w AuthForm */}
        <p className={styles.place_of_login}>WERYFIKACJA 2FA</p>

        {/* Icon jak w AuthForm */}
        <div className={styles.userIcon}>
          <img 
            src={adminIcon} 
            alt="Admin Icon" 
            className={styles.userIcon}
            style={{ cursor: 'pointer' }}
            onClick={handleBackToLogin}
          />
        </div>
      </div>
    </div>
  );
};

export default TwoFactorVerification;