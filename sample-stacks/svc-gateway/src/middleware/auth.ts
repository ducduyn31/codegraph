import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { TokenPayload, AuthenticatedRequest } from '../types/gateway';

// Create a type that ensures we're extending the Express Request
interface RequestWithUser extends Request {
  user?: TokenPayload;
}

// JWT secret key (should be in environment variables in production)
const JWT_SECRET = process.env.JWT_SECRET || 'luxury-tours-secret-key';

/**
 * Middleware to verify JWT token and add user information to request
 */
export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  // Get the authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header missing' });
  }
  
  // Check if it's a Bearer token
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Invalid authorization format' });
  }
  
  const token = parts[1];
  
  try {
    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    
    // Add user information to request
    (req as RequestWithUser).user = decoded;
    
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Middleware to check if user has admin role
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as RequestWithUser;
  
  if (!authReq.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (authReq.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  
  next();
};

/**
 * Generate a JWT token for a user
 */
export const generateToken = (payload: TokenPayload): string => {
  // Set token expiration to 24 hours
  const expiresIn = '24h';
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};