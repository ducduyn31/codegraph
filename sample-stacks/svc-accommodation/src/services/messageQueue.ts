/**
 * Message Queue Service
 *
 * This file re-exports the message queue abstraction layer that supports multiple
 * message queue providers (RabbitMQ, Kafka, SQS, etc.).
 *
 * To change the message queue provider, set the MESSAGE_QUEUE_PROVIDER environment variable:
 * - 'rabbitmq' (default): Uses RabbitMQ
 * - 'kafka': Uses Kafka (requires kafkajs package)
 * - 'mock': Uses a mock implementation for testing
 *
 * Additional configuration can be set via environment variables:
 * - MESSAGE_QUEUE_URL: The URL of the message queue server
 * - MESSAGE_QUEUE_EXCHANGE: The name of the exchange/topic
 */

export * from './messageQueue/index';