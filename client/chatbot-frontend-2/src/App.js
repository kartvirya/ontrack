import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ChatInterface from './components/ChatInterface';
import AdminDashboard from './components/AdminDashboard';
import UserProfile from './components/UserProfile';
import SplashScreen from './components/SplashScreen';
import AuthPage from './components/AuthPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './components/AuthContext';
import { NotificationProvider } from './components/NotificationSystem';
import AdminRoute from './components/AdminRoute';
import ProtectedRoute from './components/ProtectedRoute';
import KeyboardShortcuts from './components/KeyboardShortcuts';
import './App.css';

// Main App component with routing
const AppContent = () => {
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashComplete = () => {
    console.log("Splash screen completed");
    setShowSplash(false);
  };

  return (
    <ErrorBoundary>
    <div className="App relative">
      <KeyboardShortcuts />
      
      <Routes>
        <Route path="/" element={<ChatInterface />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            } 
          />
        <Route 
          path="/admin" 
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
      {/* The splash screen is conditionally rendered on top */}
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
    </div>
    </ErrorBoundary>
  );
};

// Main App component
function App() {
  return (
    <ErrorBoundary>
      <Router>
    <AuthProvider>
      <NotificationProvider>
          <AppContent />
      </NotificationProvider>
    </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
