import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  // Initialize auth state
  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (session?.user) {
          fetchUserProfile(session.user.id);
        } else {
          setUser(null);
          setRole(null);
        }
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId) => {
    try {
      console.log('Fetching user profile for user:', userId);
      
      // Fetch directly from Supabase
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('User profile query error:', error.message);
        return;
      }

      console.log('User profile fetched:', data);
      setUser(data);
      setRole(data.role);
      localStorage.setItem('user', JSON.stringify(data));
      localStorage.setItem('role', data.role);
    } catch (error) {
      console.error('Failed to fetch user profile:', error.message);
    }
  };

  const login = async (email, password, selectedRole) => {
    try {
      console.log('Attempting login with:', email, 'for role:', selectedRole);
      
      // Call backend login endpoint (which logs to audit_logs)
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
      const response = await fetch(`${backendUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          role: selectedRole,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Login error:', errorData.error);
        throw new Error(errorData.error || 'Login failed');
      }

      const data = await response.json();
      console.log('Login successful, user ID:', data.user.id);

      const userData = data.user;
      const sessionData = data.session;

      // Validate that the selected role matches the database role
      if (userData.role !== selectedRole) {
        console.error('Role mismatch:', selectedRole, 'vs', userData.role);
        throw new Error(`You are not authorized to login as ${selectedRole}. Your role is ${userData.role}.`);
      }

      // IMPORTANT: Set the session in Supabase so RLS policies work
      if (sessionData) {
        await supabase.auth.setSession(sessionData);
        console.log('Supabase session set for RLS policies');
      }

      // Store session for future authenticated requests
      setSession(sessionData);

      // Set user data
      setUser(userData);
      setRole(userData.role);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('role', userData.role);
      if (sessionData) {
        localStorage.setItem('session', JSON.stringify(sessionData));
      }
      
      console.log('Login successful for role:', userData.role);
      return true;
    } catch (error) {
      console.error('Login error:', error.message);
      throw error;
    }
  };

  const register = async (email, password, role, fullName) => {
    try {
      const response = await fetch('http://localhost:4000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role, fullName }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      // Auto-login after registration
      await login(email, password);
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setRole(null);
      setSession(null);
      localStorage.removeItem('user');
      localStorage.removeItem('role');
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      role,
      loading,
      session,
      login,
      register,
      logout,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};