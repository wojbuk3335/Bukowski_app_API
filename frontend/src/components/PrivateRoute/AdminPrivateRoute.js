import React from 'react';
import { Navigate } from 'react-router-dom';

const AdminPrivateRoute = ({ element: Component, allowedRoles, ...rest }) => {
  const userRole = localStorage.getItem('AdminRole'); // Assuming role is stored in localStorage

  return allowedRoles.includes(userRole) ? (
    <Component {...rest} />
  ) : (
    <Navigate to="/" />
  );
};

export default AdminPrivateRoute;