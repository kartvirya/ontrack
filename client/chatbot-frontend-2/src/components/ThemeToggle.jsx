import React from 'react';
import { useTheme } from './ThemeContext';

const ThemeToggle = ({ size = 'default', className = '' }) => {
  const { theme, toggleTheme, isLoading } = useTheme();

  const sizes = {
    small: 'w-8 h-8',
    default: 'w-10 h-10',
    large: 'w-12 h-12'
  };

  const iconSizes = {
    small: 'w-4 h-4',
    default: 'w-5 h-5',
    large: 'w-6 h-6'
  };

  if (isLoading) {
    return (
      <div className={`${sizes[size]} ${className} bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse`}></div>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={`
        ${sizes[size]} ${className}
        flex items-center justify-center
        bg-gray-100 hover:bg-gray-200 
        dark:bg-gray-800 dark:hover:bg-gray-700
        border border-gray-300 dark:border-gray-600
        rounded-full transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
        hover:scale-105 active:scale-95
      `}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        // Moon icon for dark mode
        <svg 
          className={`${iconSizes[size]} text-gray-600 dark:text-gray-300`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" 
          />
        </svg>
      ) : (
        // Sun icon for light mode
        <svg 
          className={`${iconSizes[size]} text-yellow-500 dark:text-yellow-400`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" 
          />
        </svg>
      )}
    </button>
  );
};

// Minimal inline toggle for tight spaces
export const InlineThemeToggle = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <button
      onClick={toggleTheme}
      className={`
        ${className}
        inline-flex items-center gap-2 px-3 py-1.5
        text-sm font-medium
        text-gray-700 dark:text-gray-300
        hover:text-gray-900 dark:hover:text-gray-100
        hover:bg-gray-100 dark:hover:bg-gray-800
        rounded-lg transition-colors duration-200
      `}
    >
      {theme === 'light' ? (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
          Dark
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          Light
        </>
      )}
    </button>
  );
};

// Theme selector dropdown
export const ThemeSelector = ({ className = '' }) => {
  const { theme, setTheme } = useTheme();
  
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Theme Preference
      </label>
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
        className="
          w-full px-3 py-2
          bg-white dark:bg-gray-800
          border border-gray-300 dark:border-gray-600
          text-gray-900 dark:text-gray-100
          rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
          transition-colors duration-200
        "
      >
        <option value="light">Light Mode</option>
        <option value="dark">Dark Mode</option>
      </select>
    </div>
  );
};

export default ThemeToggle; 