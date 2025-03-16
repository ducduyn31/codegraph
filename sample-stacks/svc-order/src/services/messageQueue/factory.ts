import { MessageQueueProvider, MessageQueueConfig, MessageQueueFactory } from './types';
import { MockMessageQueueProvider } from './mock';
import { KafkaProvider } from './kafka';

/**
 * Message queue provider types
 */
export enum MessageQueueType {
  KAFKA = 'kafka',
  MOCK = 'mock',
  // Add more provider types as needed (e.g., SQS)
}

/**
 * Create a message queue provider based on the specified type
 */
export const createMessageQueueProvider = (
  type: MessageQueueType,
  config: MessageQueueConfig
): MessageQueueProvider => {
  switch (type) {
    case MessageQueueType.KAFKA:
      return new KafkaProvider(config);
    case MessageQueueType.MOCK:
      return new MockMessageQueueProvider(config);
    default:
      throw new Error(`Unsupported message queue provider type: ${type}`);
  }
};

/**
 * Get the factory function for a specific message queue provider type
 */
export const getMessageQueueFactory = (type: MessageQueueType): MessageQueueFactory => {
  return (config: MessageQueueConfig) => createMessageQueueProvider(type, config);
};