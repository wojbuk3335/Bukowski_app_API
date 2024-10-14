import React from 'react';
import { Link } from 'react-router-dom';
import styles from './AuthForm.module.css'; // Adjust the path as necessary

const AuthForm = ({ userType, panelName, handleSubmit, handleInputChange, email, password, error, Logo, Icon}) => {
  return (
    <div className={styles.authWrapper}>
      <div className={styles.authInner}>
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
              autoComplete="off"
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
              autoComplete="off"
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
          <p className={styles.place_of_login}>{panelName}</p>
          <div className={styles.userIcon}>
            <Link to={`/${userType === 'user' ? 'admin' : 'user'}`} className={styles.tooltip}>
            <img 
                src={Icon} 
                alt={userType === 'user' ? 'Admin Icon' : 'User Icon'} 
                className={styles.userIcon} 
              />
              <span className={styles.tooltipText}>IDŹ DO PANELU {userType === 'user' ? 'PANELU ADMINISTRACYJNEGO' : 'uŻYTKOWNIKA'}</span>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthForm;