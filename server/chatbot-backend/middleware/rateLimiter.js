const rateLimit = require('express-rate-limit');

// General rate limiter for all routes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Strict rate limiter for authentication routes
// More lenient in development, strict in production
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 50, // 50 attempts in dev, 5 in production
  message: {
    error: 'Too many authentication attempts from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  // Add skip function for development
  skip: (req) => {
    // Skip rate limiting in development if specific header is present
    return process.env.NODE_ENV !== 'production' && req.headers['x-dev-bypass'] === 'true';
  }
});

// Very strict rate limiter for password reset
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'production' ? 3 : 10, // More lenient in development
  message: {
    error: 'Too many password reset attempts from this IP, please try again after 1 hour.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Chat rate limiter
const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // limit each IP to 20 chat messages per minute
  message: {
    error: 'Too many messages sent, please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Function to reset rate limit for a specific IP (for development)
const resetRateLimit = (limiter, ip) => {
  if (process.env.NODE_ENV !== 'production') {
    limiter.resetKey(ip);
    console.log(`Rate limit reset for IP: ${ip}`);
  }
};

module.exports = {
  generalLimiter,
  authLimiter,
  passwordResetLimiter,
  chatLimiter,
  resetRateLimit
}; 