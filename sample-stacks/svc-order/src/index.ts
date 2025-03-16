import express, { Request, Response, NextFunction } from 'express';
import sequelize from './models/index';
import Order from './models/Order';
import OrderItem from './models/OrderItem';
import { OrderStatus, PaymentStatus, ItemType } from './types/order';
import ordersRouter from './routes/orders';
import {
  initializeMessageQueue,
  subscribeToEvents,
  closeMessageQueue,
  publishOrderEvent,
  EventType,
  Event
} from './services/messageQueue';

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(express.json());

// CORS middleware
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  next();
});

// Handle OPTIONS requests
app.options('*', (_req: Request, res: Response) => {
  res.status(200).end();
});

// Routes
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy' });
});

// Use orders router
app.use('/api/orders', ordersRouter);

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Event handler for message queue
const handleEvent = async (event: Event): Promise<void> => {
  console.log(`Processing event: ${event.type}`);
  
  try {
    // Handle accommodation events
    if (event.type === EventType.BOOKING_CANCELLED && event.payload.orderId) {
      // Find the order associated with this booking
      const order = await Order.findOne({
        include: [{
          model: OrderItem,
          as: 'items',
          where: {
            referenceId: event.payload.id,
            type: ItemType.ACCOMMODATION
          }
        }]
      });
      
      if (order) {
        console.log(`Accommodation booking cancelled for order: ${order.id}`);
        // You might want to update the order status or notify the user
      }
    }
  } catch (error) {
    console.error('Error handling event:', error);
  }
};

// Initialize database and start server
const initializeApp = async () => {
  try {
    // Sync database models
    await sequelize.sync({ force: process.env.DB_FORCE_SYNC === 'true' });
    console.log('Database synchronized');
    
    // Initialize message queue
    await initializeMessageQueue();
    
    // Subscribe to events
    await subscribeToEvents(handleEvent);
    
    // Start server
    app.listen(port, () => {
      console.log(`🚀 Order service listening on port ${port}`);
    });
    
    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM signal received: closing HTTP server');
      await closeMessageQueue();
      process.exit(0);
    });
    
    process.on('SIGINT', async () => {
      console.log('SIGINT signal received: closing HTTP server');
      await closeMessageQueue();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to initialize app:', error);
    process.exit(1);
  }
};

initializeApp();