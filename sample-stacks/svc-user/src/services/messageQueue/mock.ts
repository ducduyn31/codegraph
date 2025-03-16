import { Event, EventType } from '../messageQueue';
import { MessageQueueProvider, MessageQueueConfig } from './types';

/**
 * Mock implementation of the MessageQueueProvider interface for testing
 */
export class MockMessageQueueProvider implements MessageQueueProvider {
  private config: MessageQueueConfig;
  private events: Event[] = [];
  private eventHandlers: ((event: Event) => Promise<void>)[] = [];
  private isInitialized: boolean = false;

  constructor(config: MessageQueueConfig) {
    this.config = config;
    console.log('Mock Message Queue Provider created');
  }

  /**
   * Initialize the mock message queue
   */
  public async initialize(): Promise<void> {
    this.isInitialized = true;
    console.log('Mock message queue initialized successfully');
    return Promise.resolve();
  }

  /**
   * Publish an event to the mock message queue
   */
  public async publishEvent(event: Event): Promise<boolean> {
    if (!this.isInitialized) {
      console.error('Cannot publish event: Mock queue not initialized');
      return false;
    }

    try {
      // Store the event
      this.events.push(event);
      console.log(`Event published: ${event.type}`);

      // Notify all subscribers
      for (const handler of this.eventHandlers) {
        await handler(event);
      }

      return true;
    } catch (error) {
      console.error('Error publishing event:', error);
      return false;
    }
  }

  /**
   * Helper method to publish a user event
   */
  public async publishUserEvent(
    type: EventType,
    userId: string,
    userData: any
  ): Promise<boolean> {
    const event: Event = {
      type,
      payload: {
        userId,
        userData,
        timestamp: new Date()
      },
      timestamp: new Date()
    };
    
    return this.publishEvent(event);
  }

  /**
   * Subscribe to events from the mock message queue
   */
  public async subscribeToEvents(
    eventHandler: (event: Event) => Promise<void>
  ): Promise<void> {
    if (!this.isInitialized) {
      console.error('Cannot subscribe to events: Mock queue not initialized');
      return;
    }

    this.eventHandlers.push(eventHandler);
    console.log('Subscribed to events successfully');
    return Promise.resolve();
  }

  /**
   * Close the mock message queue
   */
  public async close(): Promise<void> {
    this.isInitialized = false;
    this.eventHandlers = [];
    console.log('Mock message queue connection closed');
    return Promise.resolve();
  }

  /**
   * Get all published events (for testing)
   */
  public getPublishedEvents(): Event[] {
    return [...this.events];
  }

  /**
   * Clear all published events (for testing)
   */
  public clearEvents(): void {
    this.events = [];
  }
}