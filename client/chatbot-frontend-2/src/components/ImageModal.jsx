import React, { useEffect } from 'react';

const ImageModal = ({ imageUrl, title, onClose }) => {
  // Close modal when Escape key is pressed
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    
    // Prevent body scrolling while modal is open
    document.body.style.overflow = 'hidden';
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'auto';
    };
  }, [onClose]);

  // Close modal when clicking on backdrop
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg p-4 max-w-4xl max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xl font-semibold">{title}</h3>
          <button 
            onClick={onClose}
            className="bg-gray-200 rounded-full p-2 hover:bg-gray-300 transition-colors"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div className="flex justify-center">
          <img 
            src={imageUrl} 
            alt={title} 
            className="max-w-full max-h-[70vh] object-contain"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "/fallback-image.svg"; // Updated to use SVG fallback
              console.error("Failed to load image:", imageUrl);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ImageModal;
