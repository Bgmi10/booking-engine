import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { Request, Response } from 'express';

// Extend Request interface to include rateLimit properties
interface RateLimitRequest extends Request {
  rateLimit?: {
    limit: number;
    remaining: number;
    resetTime: Date;
    totalHits: number;
  };
}

// Custom rate limit message handler
const createLimitHandler = (message: string) => {
  return (req: RateLimitRequest, res: Response) => {
    res.status(429).json({
      success: false,
      message,
      retryAfter: Math.round((req.rateLimit?.resetTime?.getTime() || Date.now() + 60000) - Date.now()) / 1000,
      limit: req.rateLimit?.limit || 0,
      remaining: req.rateLimit?.remaining || 0,
    });
  };
};

// General API rate limiter - catch all
export const generalLimiter = rateLimit({ 
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 2000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: createLimitHandler('🛑 Whoa there, speed racer! You\'ve hit our API limit. Time to take a coffee break ☕ and let our servers breathe. Try again in a few minutes! 😅'),
});

// Admin routes rate limiter - most restrictive
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 100 requests per windowMs for admin routes
  message: 'Too many admin requests from this IP, please tr y again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimitHandler('🚫 Nice try, hacker! 😏 Admin routes aren\'t your playground. Take a timeout and rethink your life choices! 🤔💭'),
  // Skip successful requests for some admin operations
  skipSuccessfulRequests: false,
});

// Payment and financial operations - very restrictive
export const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs for payment routes
  message: 'Too many payment requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimitHandler('💸 Hold up, money bags! 🤑 You\'re hitting our payment endpoints like it\'s Black Friday. Slow your roll before we call the cyber police! 🚔💨'),
});

// Channel manager webhooks - moderate limits
export const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs
  message: 'Too many webhook requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimitHandler('🪝 Webhook overload detected! 📡 Your webhooks are more aggressive than a telemarketer. Maybe check your retry logic? 🔄😤'),
  // Skip failed requests for webhooks as they might be retried
  skipFailedRequests: true,
});

// Public API routes (rooms, bookings, etc.) - more lenient
export const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimitHandler('🛑 Pump the brakes, turbo! 🏎️💨 You\'re requesting faster than a kid asking "are we there yet?". Cool down and try again! 🧊😎'),
});

// Authentication routes - moderate restrictions
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 login attempts per windowMs
  message: 'Too many authentication attempts from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimitHandler('🔐 Brute force much? 🤨 Either you forgot your password or you\'re up to no good. Either way, take a breather! 🧘‍♂️✋'),
  // Only count failed requests for auth
  skipSuccessfulRequests: true,
});

// Progressive delay middleware - slows down requests before hitting rate limit
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 100, // Allow 100 requests per windowMs without delay
  delayMs: () => 500, // Add 500ms delay per request after delayAfter
  maxDelayMs: 20000, // Maximum delay of 20 seconds
});

// Aggressive speed limiter for sensitive operations
export const aggressiveSpeedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 25, // Allow only 25 requests per windowMs without delay
  delayMs: () => 1000, // Add 1 second delay per request after delayAfter
  maxDelayMs: 30000, // Maximum delay of 30 seconds
});

// Create a factory function for custom rate limiters
export const createCustomLimiter = (options: {
  windowMs?: number;
  max: number;
  message: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max,
    message: options.message,
    standardHeaders: true,
    legacyHeaders: false,
    handler: createLimitHandler(options.message),
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    skipFailedRequests: options.skipFailedRequests || false,
  });
};
