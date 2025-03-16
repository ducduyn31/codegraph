import express, { Request, Response } from 'express';
import cors from 'cors';
import { initializeMessageQueue, subscribeToEvents, closeMessageQueue, createAndPublishEvent } from './services/messageQueue';
import { EventType, ServiceHealth, GatewayHealth } from './types/gateway';
import routes from './routes';

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

// Service health status
const serviceStatus: { [key: string]: ServiceHealth } = {
  user: {
    service: 'user',
    status: 'unhealthy',
    timestamp: new Date().toISOString()
  },
  order: {
    service: 'order',
    status: 'unhealthy',
    timestamp: new Date().toISOString()
  },
  accommodation: {
    service: 'accommodation',
    status: 'unhealthy',
    timestamp: new Date().toISOString()
  }
};

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  const healthResponse: GatewayHealth = {
    gateway: {
      status: 'healthy',
      timestamp: new Date().toISOString()
    },
    services: Object.values(serviceStatus)
  };
  
  res.json(healthResponse);
});

// Check service health
const checkServiceHealth = async (service: string, url: string): Promise<void> => {
  try {
    const response = await fetch(`${url}/health`);
    
    if (response.ok) {
      serviceStatus[service] = {
        service,
        status: 'healthy',
        timestamp: new Date().toISOString()
      };
    } else {
      serviceStatus[service] = {
        service,
        status: 'unhealthy',
        timestamp: new Date().toISOString()
      };
    }
  } catch (error) {
    console.error(`Error checking ${service} service health:`, error);
    serviceStatus[service] = {
      service,
      status: 'unhealthy',
      timestamp: new Date().toISOString()
    };
  }
};

// Check all services health
const checkAllServicesHealth = async (): Promise<void> => {
  const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://svc-user:3000';
  const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://svc-order:3001';
  const ACCOMMODATION_SERVICE_URL = process.env.ACCOMMODATION_SERVICE_URL || 'http://svc-accommodation:3002';
  
  await Promise.all([
    checkServiceHealth('user', USER_SERVICE_URL),
    checkServiceHealth('order', ORDER_SERVICE_URL),
    checkServiceHealth('accommodation', ACCOMMODATION_SERVICE_URL)
  ]);
};

// Event handler for message queue
const handleEvent = async (event: any): Promise<void> => {
  console.log(`Processing event: ${event.type}`);
  
  // Handle events from other services if needed
};

// Use routes
app.use(routes);

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize and start server
const initializeApp = async () => {
  try {
    // Initialize message queue
    await initializeMessageQueue();
    
    // Subscribe to events
    await subscribeToEvents(handleEvent);
    
    // Start server
    app.listen(port, () => {
      console.log(`🚀 API Gateway service listening on port ${port}`);
      
      // Publish gateway started event
      createAndPublishEvent(EventType.GATEWAY_STARTED, {
        timestamp: new Date().toISOString()
      });
    });
    
    // Check services health periodically
    setInterval(checkAllServicesHealth, 30000); // Every 30 seconds
    
    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM signal received: closing HTTP server');
      
      // Publish gateway stopped event
      await createAndPublishEvent(EventType.GATEWAY_STOPPED, {
        timestamp: new Date().toISOString()
      });
      
      await closeMessageQueue();
      process.exit(0);
    });
    
    process.on('SIGINT', async () => {
      console.log('SIGINT signal received: closing HTTP server');
      
      // Publish gateway stopped event
      await createAndPublishEvent(EventType.GATEWAY_STOPPED, {
        timestamp: new Date().toISOString()
      });
      
      await closeMessageQueue();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to initialize app:', error);
    process.exit(1);
  }
};

initializeApp();