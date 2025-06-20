import React from 'react';

const LoadingSpinner = ({ 
  size = 'md', 
  color = 'blue', 
  text = '', 
  fullScreen = false,
  className = '' 
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4';
      case 'lg':
        return 'w-12 h-12';
      case 'xl':
        return 'w-16 h-16';
      default:
        return 'w-8 h-8';
    }
  };

  const getColorClasses = () => {
    switch (color) {
      case 'white':
        return 'border-white dark:border-gray-200 border-t-transparent';
      case 'gray':
        return 'border-gray-300 dark:border-gray-600 border-t-transparent';
      case 'green':
        return 'border-green-500 dark:border-green-400 border-t-transparent';
      case 'red':
        return 'border-red-500 dark:border-red-400 border-t-transparent';
      case 'yellow':
        return 'border-yellow-500 dark:border-yellow-400 border-t-transparent';
      default:
        return 'border-blue-500 dark:border-blue-400 border-t-transparent';
    }
  };

  const spinner = (
    <div className={`animate-spin ${getSizeClasses()} border-2 ${getColorClasses()} rounded-full transition-colors duration-300 ${className}`}></div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg border border-gray-100 dark:border-gray-700 transition-colors duration-300">
          <div className="text-center">
            {spinner}
            {text && <p className="mt-4 text-gray-600 dark:text-gray-300 transition-colors duration-300">{text}</p>}
          </div>
        </div>
      </div>
    );
  }

  if (text) {
    return (
      <div className="flex items-center justify-center space-x-2">
        {spinner}
        <span className="text-gray-600 dark:text-gray-300 transition-colors duration-300">{text}</span>
      </div>
    );
  }

  return spinner;
};

// Skeleton loader for content
export const SkeletonLoader = ({ className = '', lines = 3, animate = true }) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: lines }).map((_, index) => (
      <div
        key={index}
        className={`h-4 bg-gray-200 dark:bg-gray-700 rounded transition-colors duration-300 ${
          animate ? 'animate-pulse' : ''
        }`}
        style={{
          width: `${Math.random() * 40 + 60}%`
        }}
      ></div>
    ))}
  </div>
);

// Card skeleton for loading cards
export const CardSkeleton = ({ className = '' }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 transition-colors duration-300 ${className}`}>
    <div className="animate-pulse">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
      </div>
    </div>
  </div>
);

// Table skeleton loader
export const TableSkeleton = ({ rows = 5, columns = 4, className = '' }) => {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="bg-gray-50 rounded-t-lg p-4">
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: columns }).map((_, index) => (
            <div key={index} className="h-4 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-b-lg">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="p-4 border-b border-gray-100 last:border-b-0">
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <div key={colIndex} className="h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Button loading state
export const LoadingButton = ({ 
  loading = false, 
  children, 
  className = '', 
  disabled = false,
  ...props 
}) => {
  return (
    <button
      className={`relative ${className} ${loading || disabled ? 'opacity-75 cursor-not-allowed' : ''}`}
      disabled={loading || disabled}
      {...props}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner size="sm" color="white" />
        </div>
      )}
      <span className={loading ? 'invisible' : 'visible'}>
        {children}
      </span>
    </button>
  );
};

export default LoadingSpinner; 