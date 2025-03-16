import { MessageQueueProvider, MessageQueueConfig, MessageQueueFactory } from './types';
import { RabbitMQProvider } from './rabbitmq';
import { MockMessageQueueProvider } from './mock';

// Import Kafka provider conditionally to avoid errors if kafkajs is not installed
let KafkaProvider: any;
try {
  // Dynamic import to avoid errors if kafkajs is not installed
  KafkaProvider = require('./kafka').KafkaProvider;
} catch (error) {
  console.warn('Kafka provider not available. To use Kafka, install the kafkajs package.');
}

/**
 * Message queue provider types
 */
export enum MessageQueueType {
  RABBITMQ = 'rabbitmq',
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
    case MessageQueueType.RABBITMQ:
      return new RabbitMQProvider(config);
    case MessageQueueType.KAFKA:
      if (!KafkaProvider) {
        throw new Error('Kafka provider is not available. Please install the kafkajs package.');
      }
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