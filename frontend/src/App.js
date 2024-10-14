import React from 'react';
import '../node_modules/bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminLogin from './components/AdminLogin/AdminLogin';
import UserLogin from './components/UserLogin/UserLogin';
import UserDashboard from './components/UserDashboard/UserDashboard';
import AdminDashboard from './components/AdminDashboard/AdminDashboard';
import PrivateRoute from './components/PrivateRoute/PrivateRoute';

function App() {
  return (
    <Router>
      <div className="App">
          <Routes>
            <Route path="/" element={<Navigate to="/user" />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/user" element={<UserLogin />} />
            <Route path="/admin/dashboard/*" element={<PrivateRoute element={AdminDashboard} allowedRoles={['admin']} />}/>
            <Route path="/user/dashboard/*" element={<PrivateRoute element={UserDashboard} allowedRoles={['user']} />}/>
          </Routes>
      </div>
    </Router>
  );
}

export default App;