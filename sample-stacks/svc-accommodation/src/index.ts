import express, { Request, Response } from 'express';
import sequelize from './models/index';
import { initializeMessageQueue, subscribeToEvents, closeMessageQueue } from './services/messageQueue';
import { EventType, Event } from './types/accommodation';

// Import routes
import propertiesRouter from './routes/properties';
import roomsRouter from './routes/rooms';
import bookingsRouter from './routes/bookings';
import imagesRouter from './routes/images';

// Import models to ensure they are initialized
import './models/Property';
import './models/Room';
import './models/Availability';
import './models/Image';
import './models/Policy';
import './models/Review';
import './models/Booking';

const app = express();
const port = process.env.PORT || 3002;

// Middleware
app.use(express.json());

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

// Routes
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy' });
});

// API routes
app.use('/api/properties', propertiesRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/images', imagesRouter);

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Event handler for message queue
const handleEvent = async (event: Event): Promise<void> => {
  console.log(`Processing event: ${event.type}`);
  
  try {
    switch (event.type) {
      case EventType.BOOKING_CREATED:
        // Handle booking created event
        console.log('Booking created:', event.payload.id);
        break;
        
      case EventType.BOOKING_CONFIRMED:
        // Handle booking confirmed event
        console.log('Booking confirmed:', event.payload.id);
        break;
        
      case EventType.BOOKING_CANCELLED:
        // Handle booking cancelled event
        console.log('Booking cancelled:', event.payload.id);
        break;
        
      default:
        console.log('Unhandled event type:', event.type);
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
      console.log(`🚀 Accommodation service listening on port ${port}`);
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