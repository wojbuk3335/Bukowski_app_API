import React from 'react';
import '../node_modules/bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLogin from './components/AdminLogin/AdminLogin';
import UserLogin from './components/UserLogin/UserLogin';
import UserDashboard from './components/UserDashboard/UserDashboard';
import AdminPrivateRoute from './components/PrivateRoute/AdminPrivateRoute';
import UserPrivateRoute from './components/PrivateRoute/UserPrivateRoute';
import AdminDashboard from './components/AdminDashboard/AdminDashboard';
import Stock from './components/AdminDashboard/Stock/Stock';
import NoFound from './components/AdminDashboard/NoFound/NoFound';
import Profile from './components/AdminDashboard/Profile/Profile';
import Colors from './components/AdminDashboard/Colors/Colors';
import Sizes from './components/AdminDashboard/Sizes/Sizes';
import Searchengine from './components/AdminDashboard/Searchengine/Searchengine';
import Users from './components/AdminDashboard/Users/Users';
import UserProfile from './components/UserDashboard/Profile/Profile';
import Goods from './components/AdminDashboard/Goods/Goods';
import State from './components/AdminDashboard/State/State';
import Jacketscoatsfurs from './components/AdminDashboard/Category/Jacketscoatsfurs/Jacketscoatsfurs';

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Navigate to="/user" />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/user" element={<UserLogin />} />
        <Route path="/admin/dashboard/*" element={<AdminPrivateRoute element={AdminDashboard} allowedRoles={['admin']} />}>
          <Route path="stock" element={<Stock />} />
          <Route path="profile" element={<Profile />} />
          <Route path='colors' element={<Colors />} />
          <Route path='sizes' element={<Sizes />} />
          <Route path='searchengine' element={<Searchengine />} />
          <Route path='users' element={<Users />} />
          <Route path='goods' element={<Goods />} />
          <Route path="category">
            <Route path="jacketscoatsfurs" element={<Jacketscoatsfurs />} />
          </Route>
          <Route path="state" element={<State />} />
        </Route>
        <Route path="/admin/dashboard/*" element={<AdminPrivateRoute element={NoFound} allowedRoles={['admin']} />} />
        <Route path="/user/dashboard/*" element={<UserPrivateRoute element={UserDashboard} allowedRoles={['user']} />}>
          <Route path="profile" element={<UserProfile />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;