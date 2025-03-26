import React from 'react';
import { Navigate } from 'react-router-dom';

const UserPrivateRoute = ({ element: Component, allowedRoles, ...rest }) => {
  const userRole = localStorage.getItem('UserRole'); // Assuming role is stored in localStorage

  return allowedRoles.includes(userRole) ? (
    <Component {...rest} />
  ) : (
    <Navigate to="/" />
  );
};

export default UserPrivateRoute;