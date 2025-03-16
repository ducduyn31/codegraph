import { Router, Request, Response, NextFunction } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { authenticateJWT, requireAdmin } from '../middleware/auth';
import { defaultRateLimiter, strictRateLimiter, authRateLimiter, createRateLimiter } from '../middleware/rateLimit';
import { RouteConfig } from '../types/gateway';

// Create router
const router = Router();

// Service URLs
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://svc-user:3000';
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://svc-order:3001';
const ACCOMMODATION_SERVICE_URL = process.env.ACCOMMODATION_SERVICE_URL || 'http://svc-accommodation:3002';

// Route configurations
const routes: RouteConfig[] = [
  // User service routes
  {
    path: '/api/users',
    target: USER_SERVICE_URL,
    auth: true,
    rateLimit: { windowMs: 15 * 60 * 1000, max: 100 }
  },
  
  // Order service routes
  {
    path: '/api/orders',
    target: ORDER_SERVICE_URL,
    auth: true,
    rateLimit: { windowMs: 15 * 60 * 1000, max: 100 }
  },
  
  // Accommodation service routes
  {
    path: '/api/properties',
    target: ACCOMMODATION_SERVICE_URL,
    auth: false
  },
  {
    path: '/api/rooms',
    target: ACCOMMODATION_SERVICE_URL,
    auth: false
  },
  {
    path: '/api/bookings',
    target: ACCOMMODATION_SERVICE_URL,
    auth: true
  },
  {
    path: '/api/images',
    target: ACCOMMODATION_SERVICE_URL,
    auth: false
  },
  
  // Health check routes (no auth required)
  {
    path: '/health/user',
    target: `${USER_SERVICE_URL}/health`,
    auth: false
  },
  {
    path: '/health/order',
    target: `${ORDER_SERVICE_URL}/health`,
    auth: false
  },
  {
    path: '/health/accommodation',
    target: `${ACCOMMODATION_SERVICE_URL}/health`,
    auth: false
  }
];

// Set up routes
routes.forEach((route) => {
  // Create an array to hold middleware functions
  const middlewareStack: Array<(req: Request, res: Response, next: NextFunction) => void> = [];
  
  // Add rate limiting if configured
  if (route.rateLimit) {
    const limiter = createRateLimiter(route.rateLimit.windowMs, route.rateLimit.max);
    middlewareStack.push((req: Request, res: Response, next: NextFunction) => {
      limiter(req, res, next);
    });
  }
  
  // Add authentication if required
  if (route.auth) {
    middlewareStack.push((req: Request, res: Response, next: NextFunction) => {
      authenticateJWT(req, res, next);
    });
  }
  
  // Add proxy middleware
  const proxyOptions = {
    target: route.target,
    changeOrigin: true,
    pathRewrite: (path: string) => {
      // Remove the service-specific prefix for health endpoints
      if (path.startsWith('/health/')) {
        return '/health';
      }
      return path;
    },
    logLevel: 'silent'
  };
  
  // Add the proxy middleware to the stack
  middlewareStack.push((req: Request, res: Response, next: NextFunction) => {
    const proxyMiddleware = createProxyMiddleware(proxyOptions);
    proxyMiddleware(req, res, next);
  });
  
  // Set up the route with all middlewares
  router.use(route.path, ...middlewareStack);
});

// Admin routes
router.get('/admin/services',
  // Add authentication middleware
  (req: Request, res: Response, next: NextFunction) => {
    authenticateJWT(req, res, next);
  },
  // Add admin check middleware
  (req: Request, res: Response, next: NextFunction) => {
    requireAdmin(req, res, next);
  },
  // Handle the request
  (req: Request, res: Response, next: NextFunction) => {
    res.json({
      services: [
        { name: 'user', url: USER_SERVICE_URL, healthEndpoint: '/health/user' },
        { name: 'order', url: ORDER_SERVICE_URL, healthEndpoint: '/health/order' },
        { name: 'accommodation', url: ACCOMMODATION_SERVICE_URL, healthEndpoint: '/health/accommodation' }
      ]
    });
    next();
  }
);

export default router;