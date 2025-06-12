import React, { useEffect } from 'react';
import './SplashScreen.css'; // We'll create this file next

const SplashScreen = ({ onComplete }) => {
  useEffect(() => {
    // Set a timer to call onComplete after the animation duration
    // Animation is 5s total (4s delay + 1s fade)
    const timer = setTimeout(() => {
      onComplete();
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [onComplete]);
  
  return (
    <div className="splash-screen-container">
      <div className="splash-screen-content">
        <div className="splash-title">OnTrack</div>
        <div className="splash-subtitle">AI-Powered Train Maintenance Assistant</div>
        <video 
          src="/Lisa.mp4"
          className="splash-screen-video"
          muted
          autoPlay
          playsInline
          loop
          onError={(e) => {
            console.error('Video failed to load:', e);
            // Fallback: show a loading animation or logo
          }}
        />
        <div style={{ marginTop: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
          Loading your intelligent assistant...
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
