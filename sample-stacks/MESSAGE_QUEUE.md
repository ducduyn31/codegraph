# Message Queue Abstraction

This project includes a flexible message queue abstraction layer that allows you to easily switch between different message queue providers (Kafka, etc.) without changing your application code.

## Architecture

The message queue abstraction is implemented using the Adapter pattern, which provides a common interface for different message queue providers. The abstraction consists of the following components:

- **MessageQueueProvider Interface**: Defines the common operations that all message queue implementations must support.
- **Concrete Implementations**: Implementations for specific message queue providers (Kafka, etc.).
- **Factory**: Creates the appropriate implementation based on configuration.
- **Configuration**: Environment variables that control which provider to use and how to connect to it.

## Available Providers

The following message queue providers are currently supported:

- **Kafka** (default): A distributed streaming platform with high throughput and scalability.
- **Mock**: A simple in-memory implementation for testing purposes.

## Configuration

You can configure the message queue provider using the following environment variables:

- `MESSAGE_QUEUE_PROVIDER`: The provider to use (`kafka` or `mock`).
- `MESSAGE_QUEUE_URL`: The URL to connect to the message queue server.
- `MESSAGE_QUEUE_EXCHANGE`: The name of the exchange/topic to use.

### Example Configuration

#### Using Kafka (default)

```bash
MESSAGE_QUEUE_PROVIDER=kafka
MESSAGE_QUEUE_URL=kafka1:9092,kafka2:9094,kafka3:9095
MESSAGE_QUEUE_EXCHANGE=luxury_tours
```

#### Using Mock (for testing)

```bash
MESSAGE_QUEUE_PROVIDER=mock
```

## Docker Compose Configuration

The `docker-compose.yml` file includes a Kafka cluster with 3 brokers using KRaft mode. By default, Kafka is used as the message queue provider.

### Kafka Cluster Configuration

The Kafka cluster consists of:
- 3 Kafka brokers (kafka1, kafka2, kafka3) for high availability and fault tolerance
- KRaft mode (Kafka Raft) for metadata management without ZooKeeper
- Combined mode nodes (both controller and broker roles)
- Replication factor of 3 for data redundancy
- Minimum in-sync replicas set to 2 for data consistency

### Running with Kafka (default)

```bash
docker-compose up
```

### KRaft Mode

The Kafka cluster is configured to use KRaft (Kafka Raft) mode, which is the new consensus protocol in Kafka that eliminates the dependency on ZooKeeper. Benefits of KRaft mode include:

- Simplified architecture with no ZooKeeper dependency
- Improved scalability and performance
- Better fault tolerance and recovery
- Reduced operational complexity
- Future-proof as ZooKeeper is being phased out in Apache Kafka

Each Kafka node in the cluster is configured in combined mode, meaning it serves both as a controller (handling metadata) and a broker (handling data).

### Debugging Tools

The stack includes the following debugging tools:

- **AKHQ**: A Kafka UI for monitoring and managing Kafka clusters, available at http://localhost:8080
- **pgAdmin**: A PostgreSQL administration and development platform, available at http://localhost:5050 (login with admin@example.com / admin)

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

- For Kafka: `kafkajs`
- For AWS SQS: `aws-sdk`

Make sure to install the required dependencies for the providers you want to use:

```bash
# For Kafka
npm install kafkajs

# For AWS SQS
npm install aws-sdk