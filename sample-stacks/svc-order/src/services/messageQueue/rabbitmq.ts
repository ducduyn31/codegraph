import amqplib from 'amqplib';
import { Event, EventType } from '../messageQueue';
import { OrderStatus, PaymentStatus } from '../../types/order';
import { MessageQueueProvider, MessageQueueConfig } from './types';

/**
 * RabbitMQ implementation of the MessageQueueProvider interface
 */
export class RabbitMQProvider implements MessageQueueProvider {
  private connection: any = null;
  private channel: any = null;
  private config: MessageQueueConfig;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(config: MessageQueueConfig) {
    this.config = config;
  }

  /**
   * Initialize the RabbitMQ connection and channel
   */
  public async initialize(): Promise<void> {
    try {
      // Create connection
      this.connection = await amqplib.connect(this.config.url);
      
      // Create channel
      if (this.connection) {
        this.channel = await this.connection.createChannel();
      
        // Declare exchange
        if (this.channel) {
          await this.channel.assertExchange(this.config.exchangeName, 'topic', { durable: true });
          
          // Declare queues and bind them to the exchange
          for (const [service, queueName] of Object.entries(this.config.queues)) {
            await this.channel.assertQueue(queueName, { durable: true });
            await this.channel.bindQueue(queueName, this.config.exchangeName, `${service}.*`);
          }
          
          console.log('RabbitMQ initialized successfully');
        }
      }
      
      // Set up event handlers for connection and channel errors
      if (this.connection) {
        this.connection.on('error', (err: Error) => {
          console.error('RabbitMQ connection error:', err);
          this.reconnect();
        });
        
        this.connection.on('close', () => {
          console.error('RabbitMQ connection closed');
          this.reconnect();
        });
      }
      
    } catch (error) {
      console.error('Failed to initialize RabbitMQ:', error);
      // Attempt to reconnect after a delay
      this.scheduleReconnect();
    }
  }

  /**
   * Reconnect to RabbitMQ
   */
  private reconnect(): void {
    this.scheduleReconnect();
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    console.log('Attempting to reconnect to RabbitMQ...');
    this.reconnectTimeout = setTimeout(() => this.initialize(), 5000);
  }

  /**
   * Publish an event to the message queue
   */
  public async publishEvent(event: Event): Promise<boolean> {
    if (!this.channel) {
      console.error('Cannot publish event: Channel not initialized');
      return false;
    }
    
    try {
      // Determine routing key based on event type
      const routingKey = `order.${event.type.toLowerCase()}`;
      
      // Publish message
      const success = this.channel.publish(
        this.config.exchangeName,
        routingKey,
        Buffer.from(JSON.stringify(event)),
        { persistent: true }
      );
      
      if (success) {
        console.log(`Event published: ${event.type}`);
      } else {
        console.error(`Failed to publish event: ${event.type}`);
      }
      
      return success;
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
   * Subscribe to events from the message queue
   */
  public async subscribeToEvents(
    eventHandler: (event: Event) => Promise<void>
  ): Promise<void> {
    if (!this.channel) {
      console.error('Cannot subscribe to events: Channel not initialized');
      return;
    }
    
    try {
      // Consume messages from the order queue
      await this.channel.consume(
        this.config.queues.order,
        async (msg: amqplib.ConsumeMessage | null) => {
          if (!msg) return;
          
          try {
            const event = JSON.parse(msg.content.toString()) as Event;
            console.log(`Received event: ${event.type}`);
            
            // Process the event
            await eventHandler(event);
            
            // Acknowledge the message
            this.channel?.ack(msg);
          } catch (error) {
            console.error('Error processing event:', error);
            // Reject the message and requeue it
            this.channel?.nack(msg, false, true);
          }
        },
        { noAck: false }
      );
      
      // Also consume messages from the accommodation queue for relevant events
      await this.channel.consume(
        this.config.queues.accommodation,
        async (msg: amqplib.ConsumeMessage | null) => {
          if (!msg) return;
          
          try {
            const event = JSON.parse(msg.content.toString()) as Event;
            console.log(`Received accommodation event: ${event.type}`);
            
            // Process the event
            await eventHandler(event);
            
            // Acknowledge the message
            this.channel?.ack(msg);
          } catch (error) {
            console.error('Error processing accommodation event:', error);
            // Reject the message and requeue it
            this.channel?.nack(msg, false, true);
          }
        },
        { noAck: false }
      );
      
      console.log('Subscribed to events successfully');
    } catch (error) {
      console.error('Error subscribing to events:', error);
    }
  }

  /**
   * Close the RabbitMQ connection
   */
  public async close(): Promise<void> {
    try {
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
      
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      
      console.log('RabbitMQ connection closed');
    } catch (error) {
      console.error('Error closing RabbitMQ connection:', error);
    }
  }
}