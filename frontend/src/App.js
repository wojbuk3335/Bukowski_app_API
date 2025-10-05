import React, { useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import './styles/custom.css';
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
import Warehouse from './components/AdminDashboard/Warehouse/Warehouse';
import State from './components/AdminDashboard/State/State';
import Category from './components/AdminDashboard/Category/Category';
import BagsCategory from './components/AdminDashboard/Category/Bags';
import WalletsCategory from './components/AdminDashboard/Category/Wallets';
import Localization from './components/AdminDashboard/Localization/Localization';
import Bags from './components/AdminDashboard/Bags/Bags';
import Wallets from './components/AdminDashboard/Wallets/Wallets';
import SeachEngineList from './components/AdminDashboard/Searchengine/SeachEngineList/SeachEngineList';
import SeachEngineTable from './components/AdminDashboard/Searchengine/SeachEngineTable/SeachEngineTable';
import History from './components/AdminDashboard/History/History';
import Corrections from './components/AdminDashboard/Corrections/Corrections';
import Sales from './components/AdminDashboard/Sales/Sales';
import AddToState from './components/AdminDashboard/AddToState/AddToState';

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
          <Route path='localization' element={<Localization />} />
          <Route path='bags' element={<Bags />} />
          <Route path='wallets' element={<Wallets />} />
          <Route path='torebki' element={<Bags />} />  {/* Alias dla jasności */}
          <Route path='searchengine' element={<Searchengine />}>
            <Route path='list' element={<SeachEngineList />} />
            <Route path='table' element={<SeachEngineTable />} />
          </Route>
          <Route path='users' element={<Users />} />
          <Route path='goods' element={<Goods />} />
          <Route path="category">
            <Route path="category" element={<Category />} />
            <Route path="bags" element={<BagsCategory />} />
            <Route path="wallets" element={<WalletsCategory />} />
          </Route>
          <Route path="state" element={<State />} />
          <Route path="state/:userId" element={<State />} />
          <Route path="warehouse" element={<Warehouse />} />
          <Route path="history" element={<History />} />
          <Route path="corrections" element={<Corrections />} />
          <Route path="addtostate" element={<AddToState />} />
          <Route path="sales" element={<Sales/>} />
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