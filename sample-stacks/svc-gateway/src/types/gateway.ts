/**
 * Gateway service type definitions
 */

// Service information
export interface ServiceInfo {
  name: string;
  url: string;
  healthEndpoint: string;
  isActive: boolean;
}

// JWT token payload
export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

// Request with user information
export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

// Service health status
export interface ServiceHealth {
  service: string;
  status: 'healthy' | 'unhealthy';
  timestamp: string;
}

// Gateway health response
export interface GatewayHealth {
  gateway: {
    status: 'healthy';
    timestamp: string;
  };
  services: ServiceHealth[];
}

// Event types for message queue
export enum EventType {
  SERVICE_STATUS_CHANGED = 'SERVICE_STATUS_CHANGED',
  GATEWAY_STARTED = 'GATEWAY_STARTED',
  GATEWAY_STOPPED = 'GATEWAY_STOPPED'
}

// Event interface for message queue
export interface Event {
  id: string;
  type: EventType;
  timestamp: string;
  payload: any;
}

// Route configuration
export interface RouteConfig {
  path: string;
  target: string;
  auth: boolean;
  rateLimit?: {
    windowMs: number;
    max: number;
  };
}