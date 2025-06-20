import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationSystem';
import LoadingSpinner from './LoadingSpinner';

const AuthPage = () => {
  const [mode, setMode] = useState('login'); // 'login', 'register', 'forgot-password'
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const { login, register, isAuthenticated, API_URL } = useAuth();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    if (isAuthenticated()) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const validateForm = () => {
    const newErrors = {};

    if (mode === 'register' || mode === 'forgot-password') {
      if (!formData.email) {
        newErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Email is invalid';
      }
    }

    if (mode !== 'forgot-password') {
      if (!formData.username) {
        newErrors.username = 'Username is required';
      } else if (formData.username.length < 3) {
        newErrors.username = 'Username must be at least 3 characters';
      }

      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }

      if (mode === 'register') {
        if (!formData.confirmPassword) {
          newErrors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'login') {
        console.log('Attempting login with:', { username: formData.username });
        const result = await login(formData.username, formData.password);
        
        console.log('Login result:', result);
        
        if (result.success) {
          addNotification({
            type: 'success',
            title: 'Welcome back!',
            message: `Successfully logged in as ${result.user.username}`,
            duration: 4000
          });
          navigate(from, { replace: true });
        } else {
          // Login failed - show error message
          throw new Error(result.error || 'Invalid username or password');
        }
      } else if (mode === 'register') {
        console.log('Attempting registration with:', { 
          username: formData.username, 
          email: formData.email 
        });
        const result = await register(formData.username, formData.email, formData.password);
        
        console.log('Registration result:', result);
        
        if (result.success) {
          addNotification({
            type: 'success',
            title: 'Account created!',
            message: `Welcome ${result.user.username}! Registration successful.`,
            duration: 4000
          });
          navigate(from, { replace: true });
        } else {
          // Registration failed - show error message
          throw new Error(result.error || 'Registration failed');
        }
      } else if (mode === 'forgot-password') {
        await handleForgotPassword();
      }
    } catch (error) {
      console.error('Authentication error:', error);
      addNotification({
        type: 'error',
        title: mode === 'login' ? 'Login Failed' : mode === 'register' ? 'Registration Failed' : 'Error',
        message: error.message || 'An unexpected error occurred',
        duration: 6000
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: formData.email })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send reset email');
      }

      addNotification({
        type: 'success',
        title: 'Reset Email Sent',
        message: 'Check your email for password reset instructions',
        duration: 5000
      });
      
      setMode('login');
    } catch (error) {
      throw error;
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setFormData({
      username: '',
      email: '',
      password: '',
      confirmPassword: ''
    });
    setErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const getTitle = () => {
    switch (mode) {
      case 'login':
        return 'Sign In to LISA';
      case 'register':
        return 'Join LISA';
      case 'forgot-password':
        return 'Reset Password';
      default:
        return 'LISA Authentication';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className=" h-20 rounded-full flex items-center justify-center mb-6 overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-lg border-2 border-gray-100 dark:border-gray-700 transition-colors duration-300">  
            <img 
              src="/Lisa Logo.png" 
              alt="LISA" 
              className="h-full object-contain"
            />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2 transition-colors duration-300">
            {getTitle()}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 transition-colors duration-300">
            {mode === 'login' && 'Welcome back! Please sign in to your account'}
            {mode === 'register' && 'Join the community today'}
            {mode === 'forgot-password' && 'Enter your email to receive reset instructions'}
          </p>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 py-8 px-6 shadow-xl rounded-lg border border-gray-100 dark:border-gray-700 transition-colors duration-300">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email Field - Only for register and forgot-password */}
            {(mode === 'register' || mode === 'forgot-password') && (
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors duration-300">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-300"
                  placeholder="Enter your email"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
                )}
              </div>
            )}

            {/* Username field */}
            {mode !== 'forgot-password' && (
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors duration-300">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required={mode === 'login'}
                  value={formData.username}
                  onChange={handleInputChange}
                  className="relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-300"
                  placeholder="Enter your username"
                />
                {errors.username && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.username}</p>
                )}
              </div>
            )}

            {/* Password Field */}
            {mode !== 'forgot-password' && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors duration-300">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-300"
                  placeholder="Enter your password"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password}</p>
                )}
              </div>
            )}

            {/* Confirm Password field for register */}
            {mode === 'register' && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors duration-300">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-300"
                  placeholder="Confirm your password"
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.confirmPassword}</p>
                )}
              </div>
            )}

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300"
              >
                {isLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    {mode === 'login' && 'Sign In'}
                    {mode === 'register' && 'Create Account'}
                    {mode === 'forgot-password' && 'Send Reset Email'}
                  </>
                )}
              </button>
            </div>

            {/* Mode Switching Links */}
            <div className="text-center space-y-2">
              {mode === 'login' && (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-300 transition-colors duration-300">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('register')}
                      className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-300"
                    >
                      Sign up here
                    </button>
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 transition-colors duration-300">
                    Forgot your password?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('forgot-password')}
                      className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-300"
                    >
                      Reset it here
                    </button>
                  </p>
                </>
              )}

              {mode === 'register' && (
                <p className="text-sm text-gray-600 dark:text-gray-300 transition-colors duration-300">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-300"
                  >
                    Sign in here
                  </button>
                </p>
              )}

              {mode === 'forgot-password' && (
                <p className="text-sm text-gray-600 dark:text-gray-300 transition-colors duration-300">
                  Remember your password?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-300"
                  >
                    Sign in here
                  </button>
                </p>
              )}
            </div>

            {/* Demo Account Notice */}
            {mode === 'login' && (
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-md p-3 transition-colors duration-300">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400 dark:text-blue-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700 dark:text-blue-300 transition-colors duration-300">
                      <strong>Demo:</strong> You can also use the chat without logging in for basic functionality.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage; 