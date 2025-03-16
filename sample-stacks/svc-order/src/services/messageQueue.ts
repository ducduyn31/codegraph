/**
 * Message Queue Service
 *
 * This file defines the event types and interfaces for the message queue,
 * and re-exports the message queue abstraction layer that supports multiple
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

import { OrderStatus, PaymentStatus } from '../types/order';

// Event types
export enum EventType {
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_UPDATED = 'ORDER_UPDATED',
  ORDER_STATUS_CHANGED = 'ORDER_STATUS_CHANGED',
  PAYMENT_PROCESSED = 'PAYMENT_PROCESSED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  // Accommodation events
  BOOKING_CREATED = 'BOOKING_CREATED',
  BOOKING_CONFIRMED = 'BOOKING_CONFIRMED',
  BOOKING_CANCELLED = 'BOOKING_CANCELLED',
  AVAILABILITY_CHANGED = 'AVAILABILITY_CHANGED'
}

export interface Event {
  type: EventType;
  payload: any;
  timestamp: Date;
}

// Export the message queue implementation
export * from './messageQueue/index';