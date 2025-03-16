# Message Queue Abstraction

This project includes a flexible message queue abstraction layer that allows you to easily switch between different message queue providers (RabbitMQ, Kafka, etc.) without changing your application code.

## Architecture

The message queue abstraction is implemented using the Adapter pattern, which provides a common interface for different message queue providers. The abstraction consists of the following components:

- **MessageQueueProvider Interface**: Defines the common operations that all message queue implementations must support.
- **Concrete Implementations**: Implementations for specific message queue providers (RabbitMQ, Kafka, etc.).
- **Factory**: Creates the appropriate implementation based on configuration.
- **Configuration**: Environment variables that control which provider to use and how to connect to it.

## Available Providers

The following message queue providers are currently supported:

- **RabbitMQ** (default): A robust and widely-used message broker.
- **Kafka**: A distributed streaming platform with high throughput and scalability.
- **Mock**: A simple in-memory implementation for testing purposes.

## Configuration

You can configure the message queue provider using the following environment variables:

- `MESSAGE_QUEUE_PROVIDER`: The provider to use (`rabbitmq`, `kafka`, or `mock`).
- `MESSAGE_QUEUE_URL`: The URL to connect to the message queue server.
- `MESSAGE_QUEUE_EXCHANGE`: The name of the exchange/topic to use.

### Example Configuration

#### Using RabbitMQ (default)

```bash
MESSAGE_QUEUE_PROVIDER=rabbitmq
MESSAGE_QUEUE_URL=amqp://guest:guest@rabbitmq:5672
MESSAGE_QUEUE_EXCHANGE=luxury_tours
```

#### Using Kafka

```bash
MESSAGE_QUEUE_PROVIDER=kafka
MESSAGE_QUEUE_URL=kafka:9092
MESSAGE_QUEUE_EXCHANGE=luxury_tours
```

#### Using Mock (for testing)

```bash
MESSAGE_QUEUE_PROVIDER=mock
```

## Docker Compose Configuration

The `docker-compose.yml` file includes both RabbitMQ and Kafka services, allowing you to easily switch between them. By default, RabbitMQ is used, but you can switch to Kafka by setting the appropriate environment variables.

### Running with RabbitMQ (default)

```bash
docker-compose up
```

### Running with Kafka

```bash
MESSAGE_QUEUE_PROVIDER=kafka MESSAGE_QUEUE_URL=kafka:9092 docker-compose up
```

## Adding a New Provider

To add a new message queue provider (e.g., AWS SQS, Azure Service Bus, etc.), follow these steps:

1. Create a new implementation file in the `messageQueue` directory (e.g., `sqs.ts`).
2. Implement the `MessageQueueProvider` interface for the new provider.
3. Add the new provider to the factory in `factory.ts`.
4. Update the `MessageQueueType` enum in `factory.ts` to include the new provider.

### Example: Adding AWS SQS Provider

```typescript
// sqs.ts
import { SQS } from 'aws-sdk';
import { Event } from '../messageQueue';
import { MessageQueueProvider, MessageQueueConfig } from './types';

export class SQSProvider implements MessageQueueProvider {
  private sqs: SQS;
  private config: MessageQueueConfig;
  
  constructor(config: MessageQueueConfig) {
    this.config = config;
    this.sqs = new SQS({
      region: 'us-east-1', // Get from config or environment
    });
  }
  
  // Implement the required methods...
}
```

Then update the factory:

```typescript
// factory.ts
export enum MessageQueueType {
  RABBITMQ = 'rabbitmq',
  KAFKA = 'kafka',
  MOCK = 'mock',
  SQS = 'sqs',
}

export const createMessageQueueProvider = (
  type: MessageQueueType,
  config: MessageQueueConfig
): MessageQueueProvider => {
  switch (type) {
    // Existing cases...
    case MessageQueueType.SQS:
      return new SQSProvider(config);
    default:
      throw new Error(`Unsupported message queue provider type: ${type}`);
  }
};
```

## Dependencies

- For RabbitMQ: `amqplib`
- For Kafka: `kafkajs`
- For AWS SQS: `aws-sdk`

Make sure to install the required dependencies for the providers you want to use:

```bash
# For RabbitMQ
npm install amqplib
npm install @types/amqplib --save-dev

# For Kafka
npm install kafkajs

# For AWS SQS
npm install aws-sdk