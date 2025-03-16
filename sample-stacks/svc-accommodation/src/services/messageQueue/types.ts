/**
 * Message Queue Provider Interface
 * This interface defines the common operations that all message queue implementations must support.
 */

import { Event } from '../../types/accommodation';

export interface MessageQueueConfig {
  url: string;
  exchangeName: string;
  queues: {
    [key: string]: string;
  };
}

export interface MessageQueueProvider {
  /**
   * Initialize the message queue connection
   */
  initialize(): Promise<void>;
  
  /**
   * Publish an event to the message queue
   */
  publishEvent(event: Event): Promise<boolean>;
  
  /**
   * Subscribe to events from the message queue
   */
  subscribeToEvents(eventHandler: (event: Event) => Promise<void>): Promise<void>;
  
  /**
   * Close the message queue connection
   */
  close(): Promise<void>;
}

/**
 * Factory function to create a message queue provider
 */
export type MessageQueueFactory = (config: MessageQueueConfig) => MessageQueueProvider;