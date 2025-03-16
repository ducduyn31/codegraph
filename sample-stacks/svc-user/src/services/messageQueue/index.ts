import { Event, EventType } from '../messageQueue';
import { MessageQueueProvider, MessageQueueConfig } from './types';
import { MessageQueueType, createMessageQueueProvider } from './factory';

// Default configuration
const DEFAULT_CONFIG: MessageQueueConfig = {
  url: process.env.MESSAGE_QUEUE_URL || 'amqp://localhost:5672',
  exchangeName: process.env.MESSAGE_QUEUE_EXCHANGE || 'luxury_tours',
  queues: {
    user: 'user_events',
    order: 'order_events',
    accommodation: 'accommodation_events',
  },
};

// Provider type from environment or default to RabbitMQ
const PROVIDER_TYPE = (process.env.MESSAGE_QUEUE_PROVIDER as MessageQueueType) || MessageQueueType.RABBITMQ;

// Create the message queue provider
let provider: MessageQueueProvider | null = null;

/**
 * Initialize the message queue
 */
export const initializeMessageQueue = async (): Promise<void> => {
  try {
    // Create provider if it doesn't exist
    if (!provider) {
      provider = createMessageQueueProvider(PROVIDER_TYPE, DEFAULT_CONFIG);
    }
    
    // Initialize the provider
    await provider.initialize();
    
    console.log(`Message queue (${PROVIDER_TYPE}) initialized successfully`);
  } catch (error) {
    console.error('Failed to initialize message queue:', error);
    throw error;
  }
};

/**
 * Publish an event to the message queue
 */
export const publishEvent = async (event: Event): Promise<boolean> => {
  if (!provider) {
    console.error('Cannot publish event: Message queue not initialized');
    return false;
  }
  
  return await provider.publishEvent(event);
};

/**
 * Publish a user event to the message queue
 */
export const publishUserEvent = async (
  type: EventType,
  userId: string,
  userData: any
): Promise<boolean> => {
  if (!provider) {
    console.error('Cannot publish event: Message queue not initialized');
    return false;
  }
  
  // Check if the provider has the publishUserEvent method
  if ('publishUserEvent' in provider) {
    return await (provider as any).publishUserEvent(
      type,
      userId,
      userData
    );
  }
  
  // Otherwise, create the event and use the standard publishEvent method
  const event: Event = {
    type,
    payload: {
      userId,
      userData,
      timestamp: new Date()
    },
    timestamp: new Date()
  };
  
  return await publishEvent(event);
};

/**
 * Subscribe to events from other services
 */
export const subscribeToEvents = async (
  eventHandler: (event: Event) => Promise<void>
): Promise<void> => {
  if (!provider) {
    console.error('Cannot subscribe to events: Message queue not initialized');
    return;
  }
  
  await provider.subscribeToEvents(eventHandler);
};

/**
 * Close the message queue connection
 */
export const closeMessageQueue = async (): Promise<void> => {
  if (provider) {
    await provider.close();
    provider = null;
  }
};

// Re-export the Event and EventType from the original file
// to maintain backward compatibility
export { Event, EventType } from '../messageQueue';

// Export types and factory for direct access
export * from './types';
export * from './factory';