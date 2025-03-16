import { v4 as uuidv4 } from 'uuid';
import { Event, EventType } from '../../types/gateway';
import { MessageQueueProvider, MessageQueueConfig } from './types';
import { MessageQueueType, createMessageQueueProvider } from './factory';

// Default configuration
const DEFAULT_CONFIG: MessageQueueConfig = {
  url: process.env.MESSAGE_QUEUE_URL || 'amqp://localhost:5672',
  exchangeName: process.env.MESSAGE_QUEUE_EXCHANGE || 'luxury_tours',
  queues: {
    gateway: 'gateway_events',
    accommodation: 'accommodation_events',
    order: 'order_events',
    user: 'user_events',
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
 * Create and publish a gateway event
 */
export const createAndPublishEvent = async (
  type: EventType,
  payload: any
): Promise<boolean> => {
  const event: Event = {
    id: uuidv4(),
    type,
    timestamp: new Date().toISOString(),
    payload
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

// Export types and factory for direct access
export * from './types';
export * from './factory';