const rateLimit = require('express-rate-limit');

/**
 * Login rate limiter
 * Prevents brute force attacks on login endpoint
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: {
      message: 'Too many login attempts from this IP, please try again after 15 minutes',
      code: 'TOO_MANY_ATTEMPTS'
    }
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * Password reset rate limiter
 * Prevents abuse of password reset functionality
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 reset requests per hour
  message: {
    error: {
      message: 'Too many password reset requests, please try again later',
      code: 'TOO_MANY_RESET_REQUESTS'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Registration rate limiter
 * Prevents spam registrations
 */
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 registration attempts per hour
  message: {
    error: {
      message: 'Too many registration attempts, please try again later',
      code: 'TOO_MANY_REGISTRATIONS'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * General API rate limiter
 * Applied to all API endpoints
 */
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per minute
  message: {
    error: {
      message: 'Too many requests from this IP, please slow down',
      code: 'RATE_LIMIT_EXCEEDED'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for sensitive operations
 */
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Very limited requests
  message: {
    error: {
      message: 'Too many requests for this sensitive operation',
      code: 'STRICT_RATE_LIMIT'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  loginLimiter,
  passwordResetLimiter,
  registrationLimiter,
  apiLimiter,
  strictLimiter
};