import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

/**
 * Create a rate limiter middleware with custom configuration
 * @param windowMs Time window in milliseconds
 * @param max Maximum number of requests per window
 * @param message Custom error message
 */
export const createRateLimiter = (
  windowMs: number = 15 * 60 * 1000, // 15 minutes by default
  max: number = 100, // 100 requests per window by default
  message: string = 'Too many requests, please try again later'
) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });
};

/**
 * Default rate limiter for API endpoints
 * Limits to 100 requests per 15 minutes
 */
export const defaultRateLimiter = createRateLimiter();

/**
 * Strict rate limiter for sensitive endpoints
 * Limits to 20 requests per 15 minutes
 */
export const strictRateLimiter = createRateLimiter(15 * 60 * 1000, 20);

/**
 * Very strict rate limiter for authentication endpoints
 * Limits to 5 requests per minute
 */
export const authRateLimiter = createRateLimiter(60 * 1000, 5, 'Too many authentication attempts, please try again later');