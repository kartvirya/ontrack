// API Configuration
const getApiUrl = () => {
  // In production, use the correct backend URL
  if (window.location.hostname.includes('onrender.com')) {
    return 'https://lisa-backend-yrg6.onrender.com';
  }
  
  // Check environment variable first
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Fallback to localhost for development
  return 'http://localhost:3001';
};

export const API_URL = getApiUrl();

// Debug logging
console.log('API Configuration:', {
  hostname: window.location.hostname,
  API_URL: API_URL,
  env_var: process.env.REACT_APP_API_URL,
  NODE_ENV: process.env.NODE_ENV
});

export default API_URL; 