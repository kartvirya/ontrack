import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_URL } from '../config/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Debug logging
  console.log('AuthContext using API_URL:', API_URL);

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (storedToken && storedUser) {
        try {
          // Verify token is still valid by making a test request
          const response = await fetch(`${API_URL}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${storedToken}`
            }
          });
          
          if (response.ok) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
          } else {
            // Token is invalid, clear storage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [API_URL]);

  const login = async (username, password) => {
    console.log('AuthContext: Starting login process for:', username);
    
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      console.log('AuthContext: Login response status:', response.status);
      
      const data = await response.json();
      console.log('AuthContext: Login response data:', data);

      if (!response.ok) {
        console.log('AuthContext: Login failed with error:', data.error);
        return { success: false, error: data.error || 'Login failed' };
      }

      // Store token and user data
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      setToken(data.token);
      setUser(data.user);

      console.log('AuthContext: Login successful for user:', data.user.username);
      return { success: true, user: data.user };
    } catch (error) {
      console.error('AuthContext: Login error:', error);
      return { success: false, error: error.message || 'Network error during login' };
    }
  };

  const register = async (username, email, password) => {
    console.log('AuthContext: Starting registration process for:', username, email);
    
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });

      console.log('AuthContext: Registration response status:', response.status);
      
      const data = await response.json();
      console.log('AuthContext: Registration response data:', data);

      if (!response.ok) {
        console.log('AuthContext: Registration failed with error:', data.error);
        return { success: false, error: data.error || 'Registration failed' };
      }

      // Store token and user data
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      setToken(data.token);
      setUser(data.user);

      console.log('AuthContext: Registration successful for user:', data.user.username);
      return { 
        success: true, 
        user: data.user, 
        agentInfo: data.agentInfo,
        message: data.message 
      };
    } catch (error) {
      console.error('AuthContext: Registration error:', error);
      return { success: false, error: error.message || 'Network error during registration' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const isAuthenticated = () => {
    return !!(token && user);
  };

  const isAdmin = () => {
    return user && user.role === 'admin';
  };

  const getAuthHeaders = () => {
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated,
    isAdmin,
    getAuthHeaders,
    API_URL
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 