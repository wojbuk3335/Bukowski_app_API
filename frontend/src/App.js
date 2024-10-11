import React, { useState } from 'react';
import '../node_modules/bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminLogin from './components/AdminLogin/AdminLogin';
import UserLogin from './components/UserLogin/UserLogin';

function App() {
  return (
    <Router>
      <div className="App">
        <div className="auth-wrapper">
          <Routes>
            <Route path="/" element={<Navigate to="/user" />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/user" element={<UserLogin />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;