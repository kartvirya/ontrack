import React, { useState, useEffect, createContext, useContext } from 'react';

// Notification Context
const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// Notification Provider
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (notification) => {
    const id = Date.now() + Math.random();
    const newNotification = {
      id,
      type: 'info',
      duration: 5000,
      ...notification
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto remove notification after duration
    if (newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const value = {
    notifications,
    addNotification,
    removeNotification,
    clearAll
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
};

// Notification Container
const NotificationContainer = () => {
  const { notifications, removeNotification } = useNotifications();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-lg">
      {notifications.map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
};

// Individual Notification Item
const NotificationItem = ({ notification, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for animation to complete
  };

  const getTypeStyles = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-gradient-to-r from-green-500 to-green-600 border-green-600 shadow-green-200';
      case 'error':
        return 'bg-gradient-to-r from-red-500 to-red-600 border-red-600 shadow-red-200';
      case 'warning':
        return 'bg-gradient-to-r from-yellow-500 to-yellow-600 border-yellow-600 shadow-yellow-200';
      default:
        return 'bg-gradient-to-r from-blue-500 to-blue-600 border-blue-600 shadow-blue-200';
    }
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div
      className={`
        transform transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95'}
        w-full shadow-xl rounded-xl pointer-events-auto backdrop-blur-sm
        ${getTypeStyles()} text-white border-l-4 shadow-lg
      `}
    >
      <div className="p-5">
      <div className="flex items-start max-w-xl w-full bg-white/10 p-4 rounded-xl shadow-lg backdrop-blur-md border border-white/10">
  <div className="flex-shrink-0 mt-1">
    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
      {getIcon()}
    </div>
  </div>

  <div className="ml-4 flex-1 min-w-0">
    {notification.title && (
      <p className="text-base font-semibold leading-snug text-white mb-1 truncate">
        {notification.title}
      </p>
    )}

    <p className={`text-sm text-white/90 leading-relaxed ${notification.title ? '' : 'font-medium'}`}>
      {notification.message}
    </p>

    {notification.action && (
      <div className="mt-3">
        <button
          onClick={notification.action.onClick}
          className="text-sm font-medium text-white underline hover:no-underline bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-all"
        >
          {notification.action.label}
        </button>
      </div>
    )}
  </div>

  <div className="ml-4 flex-shrink-0">
    <button
      onClick={handleClose}
      className="text-white hover:text-gray-200 focus:outline-none bg-white/0 hover:bg-white/20 rounded-full p-1.5 transition-all"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
</div>

      </div>
    </div>
  );
}; 