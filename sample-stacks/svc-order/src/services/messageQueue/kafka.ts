// NOTE: This implementation requires the kafkajs package to be installed:
// npm install kafkajs
// or
// yarn add kafkajs

import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';
import { Event, EventType } from '../messageQueue';
import { OrderStatus, PaymentStatus } from '../../types/order';
import { MessageQueueProvider, MessageQueueConfig } from './types';

/**
 * Kafka implementation of the MessageQueueProvider interface
 */
export class KafkaProvider implements MessageQueueProvider {
  private kafka: Kafka | null = null;
  private producer: Producer | null = null;
  private consumer: Consumer | null = null;
  private config: MessageQueueConfig;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private isConnected: boolean = false;

  constructor(config: MessageQueueConfig) {
    this.config = config;
  }

  /**
   * Parse broker URLs from a comma-separated string
   * @param urlString - Comma-separated list of broker URLs
   * @returns Array of broker URLs
   */
  private parseBrokerUrls(urlString: string): string[] {
    // Check if the URL contains commas, indicating multiple brokers
    if (urlString.includes(',')) {
      return urlString.split(',').map(url => url.trim());
    }
    
    // Handle single URL case
    try {
      const url = new URL(urlString);
      return [`${url.hostname}:${url.port || '9092'}`];
    } catch (error) {
      // If not a valid URL, assume it's already in the format "hostname:port"
      return [urlString];
    }
  }

  /**
   * Initialize the Kafka connection
   */
  public async initialize(): Promise<void> {
    try {
      // Parse broker URLs
      const brokers = this.parseBrokerUrls(this.config.url);

      // Create Kafka client
      this.kafka = new Kafka({
        clientId: 'luxury-tours-order',
        brokers,
      });

      // Create producer
      this.producer = this.kafka.producer();
      await this.producer.connect();

      // Create consumer
      this.consumer = this.kafka.consumer({ groupId: 'order-group' });
      await this.consumer.connect();

      // Create topics if they don't exist
      // Note: In a production environment, topics should be created by an admin
      // This is a simplified approach for demonstration purposes

      console.log('Kafka initialized successfully');
      this.isConnected = true;
    } catch (error) {
      console.error('Failed to initialize Kafka:', error);
      // Attempt to reconnect after a delay
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    console.log('Attempting to reconnect to Kafka...');
    this.reconnectTimeout = setTimeout(() => this.initialize(), 5000);
  }

  /**
   * Publish an event to Kafka
   */
  public async publishEvent(event: Event): Promise<boolean> {
    if (!this.producer || !this.isConnected) {
      console.error('Cannot publish event: Producer not initialized');
      return false;
    }

    try {
      // Determine topic based on event type
      let topic: string;

      switch (event.type) {
        case EventType.ORDER_CREATED:
        case EventType.ORDER_UPDATED:
        case EventType.ORDER_STATUS_CHANGED:
        case EventType.PAYMENT_PROCESSED:
        case EventType.ORDER_CANCELLED:
          topic = `order-${event.type.toLowerCase()}`;
          break;
        default:
          topic = 'order-events';
      }

      // Publish message
      await this.producer.send({
        topic,
        messages: [
          {
            // Use a unique key or generate one
            key: `${Date.now()}-${Math.random()}`,
            value: JSON.stringify(event),
            headers: {
              eventType: event.type,
              timestamp: new Date().toISOString(),
            },
          },
        ],
      });

      console.log(`Event published: ${event.type}`);
      return true;
    } catch (error) {
      console.error('Error publishing event:', error);
      return false;
    }
  }

  /**
   * Helper method to publish an order event
   */
  public async publishOrderEvent(
    type: EventType,
    orderId: string,
    userId: string,
    status?: OrderStatus,
    paymentStatus?: PaymentStatus,
    items?: any[]
  ): Promise<boolean> {
    const event: Event = {
      type,
      payload: {
        orderId,
        userId,
        status,
        paymentStatus,
        items,
        timestamp: new Date()
      },
      timestamp: new Date()
    };
    
    return this.publishEvent(event);
  }

  /**
   * Subscribe to events from Kafka
   */
  public async subscribeToEvents(
    eventHandler: (event: Event) => Promise<void>
  ): Promise<void> {
    if (!this.consumer || !this.isConnected) {
      console.error('Cannot subscribe to events: Consumer not initialized');
      return;
    }

    try {
      // Subscribe to order topics
      await this.consumer.subscribe({
        topics: [
          'order-events',
          'order-order_created',
          'order-order_updated',
          'order-order_status_changed',
          'order-payment_processed',
          'order-order_cancelled',
          // Also subscribe to accommodation topics that are relevant to orders
          'accommodation-booking_created',
          'accommodation-booking_confirmed',
          'accommodation-booking_cancelled'
        ],
        fromBeginning: false,
      });

      // Set up message handler
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
          try {
            if (!message.value) return;

            const event = JSON.parse(message.value.toString()) as Event;
            console.log(`Received event: ${event.type} from topic ${topic}`);

            // Process the event
            await eventHandler(event);
          } catch (error) {
            console.error('Error processing event:', error);
          }
        },
      });

      console.log('Subscribed to events successfully');
    } catch (error) {
      console.error('Error subscribing to events:', error);
    }
  }

  /**
   * Close the Kafka connection
   */
  public async close(): Promise<void> {
    try {
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }

      if (this.consumer) {
        await this.consumer.disconnect();
        this.consumer = null;
      }

      if (this.producer) {
        await this.producer.disconnect();
        this.producer = null;
      }

      this.isConnected = false;
      console.log('Kafka connection closed');
    } catch (error) {
      console.error('Error closing Kafka connection:', error);
    }
  }
}