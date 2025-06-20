import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated, getAuthHeaders, API_URL } = useAuth();

  // Load theme from localStorage or user settings
  useEffect(() => {
    const loadTheme = async () => {
      try {
        // First check localStorage for immediate theme application
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
          setTheme(savedTheme);
          applyTheme(savedTheme);
        }

        // If user is authenticated, load from user settings
        if (isAuthenticated()) {
          try {
            const response = await fetch(`${API_URL}/api/user/settings`, {
              headers: getAuthHeaders()
            });
            
            if (response.ok) {
              const data = await response.json();
              const userTheme = data.settings?.theme || 'light';
              setTheme(userTheme);
              applyTheme(userTheme);
              localStorage.setItem('theme', userTheme);
            }
          } catch (error) {
            console.warn('Failed to load user theme settings:', error);
          }
        }
      } catch (error) {
        console.error('Error loading theme:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();
  }, [isAuthenticated, API_URL, getAuthHeaders]);

  // Apply theme to document
  const applyTheme = (newTheme) => {
    const root = document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  // Toggle theme
  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);

    // Save to user settings if authenticated
    if (isAuthenticated()) {
      try {
        await fetch(`${API_URL}/api/user/settings`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify({ theme: newTheme })
        });
      } catch (error) {
        console.error('Failed to save theme setting:', error);
      }
    }
  };

  // Set specific theme
  const setThemeMode = async (newTheme) => {
    if (newTheme === theme) return;
    
    setTheme(newTheme);
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);

    // Save to user settings if authenticated
    if (isAuthenticated()) {
      try {
        await fetch(`${API_URL}/api/user/settings`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify({ theme: newTheme })
        });
      } catch (error) {
        console.error('Failed to save theme setting:', error);
      }
    }
  };

  const value = {
    theme,
    toggleTheme,
    setTheme: setThemeMode,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    isLoading
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}; 