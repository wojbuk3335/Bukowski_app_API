import React, { useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
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
import Category from './components/AdminDashboard/Category/Category';
import SeachEngineList from './components/AdminDashboard/Searchengine/SeachEngineList/SeachEngineList';
import SeachEngineTable from './components/AdminDashboard/Searchengine/SeachEngineTable/SeachEngineTable';
import History from './components/AdminDashboard/History/History';
import Raports from './components/AdminDashboard/Raports/Raports';
import Sales from './components/AdminDashboard/Sales/Sales';

function App() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = `${process.env.PUBLIC_URL}/BrowserPrint-Zebra-1.1.250.min.js`;
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      const checkBrowserPrint = () => {
        if (window.BrowserPrint) {
          window.BrowserPrint.getDefaultDevice('printer', (device) => {
            if (device && device.name) {
              console.log(`Available printer: ${device.name}`);
            } else {
              console.log('No printer available.');
            }
          }, (error) => {
            console.error('Error fetching printer:', error);
          });
        } else {
          console.error('BrowserPrint is not loaded. Retrying...');
          setTimeout(checkBrowserPrint, 500); // Retry after 500ms
        }
      };

      checkBrowserPrint();
    };

    script.onerror = () => {
      console.error('Failed to load BrowserPrint script.');
    };

    return () => {
      document.body.removeChild(script);
    };
  }, []);

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
          <Route path='searchengine' element={<Searchengine />}>
            <Route path='list' element={<SeachEngineList />} />
            <Route path='table' element={<SeachEngineTable />} />
          </Route>
          <Route path='users' element={<Users />} />
          <Route path='goods' element={<Goods />} />
          <Route path="category">
            <Route path="category" element={<Category />} />
          </Route>
          <Route path="state" element={<State />} />
          <Route path="history" element={<History />} />
          <Route path="raports" element={<Raports />} />
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