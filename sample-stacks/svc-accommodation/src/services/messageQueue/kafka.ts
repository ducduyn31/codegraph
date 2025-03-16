// NOTE: This implementation requires the kafkajs package to be installed:
// npm install kafkajs
// or
// yarn add kafkajs

import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';
import { Event, EventType } from '../../types/accommodation';
import { MessageQueueProvider, MessageQueueConfig } from './types';

/**
 * Kafka implementation of the MessageQueueProvider interface
 */
export class KafkaProvider implements MessageQueueProvider {
  private kafka: Kafka | null = null;
  private producer: Producer | null = null;
  private consumer: Consumer | null = null;
  private config: MessageQueueConfig;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnected: boolean = false;

  constructor(config: MessageQueueConfig) {
    this.config = config;
  }

  /**
   * Initialize the Kafka connection
   */
  public async initialize(): Promise<void> {
    try {
      // Extract host and port from URL
      const url = new URL(this.config.url);
      const brokers = [`${url.hostname}:${url.port || '9092'}`];

      // Create Kafka client
      this.kafka = new Kafka({
        clientId: 'luxury-tours-accommodation',
        brokers,
      });

      // Create producer
      this.producer = this.kafka.producer();
      await this.producer.connect();

      // Create consumer
      this.consumer = this.kafka.consumer({ groupId: 'accommodation-group' });
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
        case EventType.PROPERTY_CREATED:
        case EventType.PROPERTY_UPDATED:
        case EventType.BOOKING_CREATED:
        case EventType.BOOKING_CONFIRMED:
        case EventType.BOOKING_CANCELLED:
        case EventType.AVAILABILITY_CHANGED:
          topic = `accommodation-${event.type.toLowerCase()}`;
          break;
        default:
          topic = 'accommodation-events';
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
      // Subscribe to accommodation topics
      await this.consumer.subscribe({
        topics: [
          'accommodation-events',
          'accommodation-property_created',
          'accommodation-property_updated',
          'accommodation-booking_created',
          'accommodation-booking_confirmed',
          'accommodation-booking_cancelled',
          'accommodation-availability_changed'
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