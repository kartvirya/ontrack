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
        <video 
          src="/Lisa.mp4"
          className="splash-screen-video"
          muted
          autoPlay
          playsInline
        />
      </div>
    </div>
  );
};

export default SplashScreen;
