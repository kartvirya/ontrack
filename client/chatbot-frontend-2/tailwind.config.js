module.exports = {
    content: [
      "./src/**/*.{js,jsx,ts,tsx}",
    ],
    darkMode: 'class', // Enable class-based dark mode
    theme: {
      extend: {
        colors: {
          // Custom dark mode colors
          dark: {
            50: '#f8f9fa',
            100: '#f1f3f4',
            200: '#e8eaed',
            300: '#dadce0',
            400: '#bdc1c6',
            500: '#9aa0a6',
            600: '#80868b',
            700: '#5f6368',
            800: '#3c4043',
            900: '#202124',
          }
        }
      },
    },
    plugins: [],
  }