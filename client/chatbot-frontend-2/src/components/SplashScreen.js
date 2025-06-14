import React from 'react';
import './SplashScreen.css'; // We'll create this file next

const SplashScreen = ({ onComplete }) => {
  React.useEffect(() => {
    // Set a timer to call onComplete after the animation duration
    // Animation is 3 seconds
    const timer = setTimeout(() => {
      onComplete();
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [onComplete]);
  
  return (
    <div className="splash-screen">
      <div className="splash-content">
        <div className="splash-logo">🚂</div>
        <div className="splash-title">Lisa</div>
        <div className="splash-subtitle">AI Train Maintenance Assistant</div>
        <div className="splash-loading">
          <div className="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
