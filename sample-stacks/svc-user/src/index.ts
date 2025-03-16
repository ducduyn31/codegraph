import express, { Request, Response, NextFunction } from 'express';
import sequelize from './models/index';
import User from './models/User';
import {
  initializeMessageQueue,
  subscribeToEvents,
  closeMessageQueue,
  publishUserEvent,
  EventType,
  Event
} from './services/messageQueue';

const app = express();
const port = process.env.PORT || 3000;

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

// Get all users
app.get('/api/users', async (_req: Request, res: Response) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID
app.get('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create user
app.post('/api/users', async (req: Request, res: Response) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      res.status(400).json({ error: 'Name and email are required' });
      return;
    }
    
    const user = await User.create({ name, email });
    
    // Publish user created event
    await publishUserEvent(
      EventType.USER_CREATED,
      user.id.toString(),
      { name: user.name, email: user.email }
    );
    
    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
app.put('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const { name, email } = req.body;
    
    const user = await User.findByPk(req.params.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    // Update user
    if (name) user.name = name;
    if (email) user.email = email;
    await user.save();
    
    // Publish user updated event
    await publishUserEvent(
      EventType.USER_UPDATED,
      user.id.toString(),
      { name: user.name, email: user.email }
    );
    
    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Event handler for message queue
const handleEvent = async (event: Event): Promise<void> => {
  console.log(`Processing event: ${event.type}`);
  
  try {
    // Handle order events
    if (event.type === EventType.ORDER_CREATED && event.payload.userId) {
      const user = await User.findByPk(event.payload.userId);
      
      if (user) {
        console.log(`Order created for user: ${user.name}`);
        // You might want to update user statistics or send notifications
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
    
    // Add seed data if database is empty
    const count = await User.count();
    if (count === 0) {
      await User.bulkCreate([
        { name: 'John Doe', email: 'john@example.com' },
        { name: 'Jane Smith', email: 'jane@example.com' }
      ]);
      console.log('Added seed data');
    }
    
    // Initialize message queue
    await initializeMessageQueue();
    
    // Subscribe to events
    await subscribeToEvents(handleEvent);
    
    // Start server
    app.listen(port, () => {
      console.log(`🚀 User service listening on port ${port}`);
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