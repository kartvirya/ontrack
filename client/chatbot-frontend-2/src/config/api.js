// API Configuration
const getApiUrl = () => {
  const hostname = window.location.hostname;
  
  console.log('Hostname detection:', hostname);
  
  // In production on Render, use the correct backend URL
  if (hostname === 'lisa-frontend-yrg6.onrender.com') {
    console.log('Detected Render production environment');
    return 'https://lisa-backend-yrg6.onrender.com';
  }
  
  // Fallback for any onrender.com domain
  if (hostname.includes('onrender.com')) {
    console.log('Detected onrender.com domain');
    return 'https://lisa-backend-yrg6.onrender.com';
  }
  
  // Check environment variable
  if (process.env.REACT_APP_API_URL) {
    console.log('Using environment variable:', process.env.REACT_APP_API_URL);
    return process.env.REACT_APP_API_URL;
  }
  
  // Fallback to localhost for development
  console.log('Using localhost fallback');
  return 'http://localhost:3001';
};

export const API_URL = getApiUrl();

// Enhanced debug logging
console.log('=== API Configuration Debug ===');
console.log('Current hostname:', window.location.hostname);
console.log('Full URL:', window.location.href);
console.log('Selected API_URL:', API_URL);
console.log('Environment variable REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('================================');

export default API_URL; 