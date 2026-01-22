import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const savedRole = localStorage.getItem('role');
    const savedUser = localStorage.getItem('user');

    if (savedRole && savedUser) {
      setRole(savedRole);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = (email, password, selectedRole) => {
    // Simulate user authentication with hardcoded credentials
    // In production, this would call a backend API
    const userData = {
      id: '1',
      name: 'John ' + (selectedRole === 'admin' ? 'Admin' : 'User'),
      email: email,
      role: selectedRole,
      avatar: '👤',
    };

    setUser(userData);
    setRole(selectedRole);

    // Persist to localStorage
    localStorage.setItem('role', selectedRole);
    localStorage.setItem('user', JSON.stringify(userData));

    return true;
  };

  const logout = () => {
    setUser(null);
    setRole(null);
    localStorage.removeItem('role');
    localStorage.removeItem('user');
  };

  const getRole = () => role;
  const getUser = () => user;
  const isAuthenticated = () => !!role && !!user;

  const value = {
    user,
    role,
    login,
    logout,
    getRole,
    getUser,
    isAuthenticated,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
