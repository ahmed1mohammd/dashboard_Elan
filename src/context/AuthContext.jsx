import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginAdmin, getMe } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('elan_admin_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('elan_admin_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const res = await getMe();
          if (res?.data?.user) {
            setUser(res.data.user);
            localStorage.setItem('elan_admin_user', JSON.stringify(res.data.user));
          }
        } catch (err) {
          console.error('Session validation failed:', err);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [token]);

  const login = async (phone) => {
    const res = await loginAdmin(phone);
    const token = res.data?.token || res.token;
    const userData = res.data?.user || res.user;

    if (userData?.role !== 'admin') {
      throw new Error('هذا الحساب لا يمتلك صلاحيات مدير النظام (Admin Access Denied).');
    }

    if (token) {
      localStorage.setItem('elan_admin_token', token);
      setToken(token);
    }
    if (userData) {
      localStorage.setItem('elan_admin_user', JSON.stringify(userData));
      setUser(userData);
    }
    return res;
  };

  const logout = () => {
    localStorage.removeItem('elan_admin_token');
    localStorage.removeItem('elan_admin_user');
    setToken(null);
    setUser(null);
  };

  const isAuthenticated = !!token;
  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        isAuthenticated,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
