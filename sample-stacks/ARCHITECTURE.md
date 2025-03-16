# Luxury Tour Agency Microservices Architecture

## System Architecture Overview

This document provides a comprehensive overview of the microservices architecture for the Luxury Tour Agency platform.

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Applications                      │
│                                                                 │
│    ┌───────────────┐    ┌───────────────┐    ┌───────────────┐  │
│    │  Web Frontend  │    │  Mobile App   │    │  Admin Portal  │  │
│    └───────┬───────┘    └───────┬───────┘    └───────┬───────┘  │
└────────────┼─────────────────────┼─────────────────────┼────────┘
             │                     │                     │
             ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                            API Gateway                           │
└────────────┬─────────────────────┬─────────────────────┬────────┘
             │                     │                     │
┌────────────┼─────────────────────┼─────────────────────┼────────┐
│            │                     │                     │         │
│  ┌─────────▼──────────┐  ┌───────▼───────────┐  ┌─────▼───────┐ │
│  │   Authentication   │  │  Rate Limiting    │  │   Routing   │ │
│  └─────────┬──────────┘  └───────────────────┘  └─────────────┘ │
│            │                                                    │
└────────────┼────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Message Broker                           │
│                           (RabbitMQ)                             │
└────────┬──────────┬──────────┬───────────┬──────────┬───────────┘
         │          │          │           │          │
         ▼          ▼          ▼           ▼          ▼
┌──────────────┐ ┌──────────┐ ┌────────────┐ ┌────────┐ ┌──────────┐
│   svc-user   │ │svc-order │ │svc-accommo-│ │  svc-  │ │svc-feed  │
│              │ │          │ │   dation   │ │flights │ │          │
└──────┬───────┘ └────┬─────┘ └─────┬──────┘ └───┬────┘ └────┬─────┘
       │              │             │            │           │
       ▼              ▼             ▼            ▼           ▼
┌──────────────┐ ┌──────────┐ ┌────────────┐ ┌────────┐ ┌──────────┐
│   User DB    │ │ Order DB │ │Accommoda-  │ │Flight  │ │ Feed DB  │
│  (Postgres)  │ │(Postgres)│ │  tion DB   │ │  DB    │ │(Postgres)│
│              │ │          │ │ (Postgres) │ │(Postgres│ │          │
└──────────────┘ └──────────┘ └────────────┘ └────────┘ └──────────┘
```

## Service Descriptions

### API Gateway
- **Responsibility**: Routes client requests to appropriate microservices
- **Features**: Authentication, rate limiting, request routing
- **Technologies**: Express.js, JWT

### Message Broker (RabbitMQ)
- **Responsibility**: Facilitates asynchronous communication between services
- **Features**: Topic-based message routing, message persistence, event distribution
- **Technologies**: RabbitMQ

### User Service (svc-user)
- **Responsibility**: Manages user accounts, profiles, and authentication
- **Features**: User registration, authentication, profile management
- **Technologies**: Express.js, Sequelize, PostgreSQL
- **Database**: User profiles, preferences, authentication data

### Order Service (svc-order)
- **Responsibility**: Handles booking orders, payments, and order history
- **Features**: Order creation, payment processing, order status management
- **Technologies**: Express.js, Sequelize, PostgreSQL
- **Database**: Orders, order items, payment information

### Accommodation Service (svc-accommodation)
- **Responsibility**: Manages luxury property listings, availability, pricing, and bookings
- **Features**: Property management, room availability, booking management
- **Technologies**: Express.js, Sequelize, PostgreSQL
- **Database**: Properties, rooms, availabilities, bookings, images, reviews

### Flight Service (svc-flights) - Planned
- **Responsibility**: Handles flight search, booking, and management
- **Features**: Flight search, booking management, flight status updates
- **Technologies**: Express.js, Sequelize, PostgreSQL
- **Database**: Flights, cabin classes, flight bookings, passengers

### Feed Service (svc-feed) - Planned
- **Responsibility**: Provides personalized content, recommendations, and notifications
- **Features**: Personalized recommendations, notifications, search functionality
- **Technologies**: Express.js, Sequelize, PostgreSQL
- **Database**: Recommendations, notifications, search indices

## Communication Patterns

### Synchronous Communication
- **REST APIs**: Direct service-to-service communication when immediate response is required
- **Example**: Order service calling accommodation service to confirm a booking

### Asynchronous Communication
- **Event-Driven**: Services publish events to the message broker, and interested services subscribe to relevant events
- **Example**: User service publishing a USER_CREATED event when a new user registers

## Data Consistency

### Eventual Consistency
- Services maintain their own databases and achieve consistency through event propagation
- Example: When a booking is cancelled, the accommodation service releases inventory and the order service updates the order status

### Distributed Transactions
- For critical operations that span multiple services, we use a saga pattern with compensating transactions
- Example: Order creation process involving booking confirmation and payment processing

## Deployment

The services are containerized using Docker and can be deployed using Docker Compose for development or Kubernetes for production.

### Development Environment
- Docker Compose for local development
- Each service has its own Dockerfile
- Shared PostgreSQL instances for development

### Production Environment (Planned)
- Kubernetes for container orchestration
- Separate database instances for each service
- Horizontal scaling for high-availability
- Cloud-native deployment (AWS, GCP, or Azure)

## Monitoring and Observability (Planned)

- **Distributed Tracing**: Track requests across services
- **Centralized Logging**: Aggregate logs from all services
- **Metrics Collection**: Monitor service health and performance
- **Alerting**: Notify team of critical issues

## Security

- **Authentication**: JWT-based authentication
- **Authorization**: Role-based access control
- **API Security**: Rate limiting, input validation
- **Data Protection**: Encryption at rest and in transit

## Future Enhancements

1. **API Versioning**: Implement versioned APIs for backward compatibility
2. **Circuit Breakers**: Implement circuit breakers for resilience
3. **Service Discovery**: Dynamic service discovery for flexible scaling
4. **CQRS Pattern**: Separate read and write operations for scalability
5. **GraphQL API**: Provide a GraphQL API for flexible client queries