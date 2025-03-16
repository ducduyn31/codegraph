# Luxury Tour Agency Microservices

A comprehensive microservices-based backend for an online luxury tour agency platform. This system enables users to browse and book luxury accommodations, flights, and activities.

## Architecture

This project implements a microservices architecture with the following components:

- **User Service**: Manages user accounts, profiles, and authentication
- **Order Service**: Handles booking orders, payments, and order history
- **Accommodation Service**: Manages luxury property listings, availability, pricing, and bookings
- **Message Queue Abstraction**: Facilitates asynchronous communication between services with support for multiple providers (RabbitMQ, Kafka, etc.)

Future planned services:
- **Flight Service**: Will handle flight search, booking, and management
- **Feed Service**: Will provide personalized content, recommendations, and notifications

For a detailed architecture overview, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## API Documentation

For comprehensive API documentation, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md).

## Prerequisites

- [Docker](https://www.docker.com/get-started) and [Docker Compose](https://docs.docker.com/compose/install/)
- [Node.js](https://nodejs.org/) (v18 or later)
- [pnpm](https://pnpm.io/installation) (v8 or later)
- [Bun](https://bun.sh/) (v1 or later)

## Getting Started

### Clone the Repository

```bash
git clone <repository-url>
cd luxury-tour-agency
```

### Start the Services

```bash
docker-compose up
```

This will start all the services and their dependencies:

- RabbitMQ: [http://localhost:15672](http://localhost:15672) (guest/guest)
- Kafka: [http://localhost:9092](http://localhost:9092)
- User Service: [http://localhost:3000](http://localhost:3000)
- Order Service: [http://localhost:3001](http://localhost:3001)
- Accommodation Service: [http://localhost:3002](http://localhost:3002)

### Message Queue Configuration

By default, the system uses RabbitMQ as the message queue provider. You can switch to Kafka by setting the appropriate environment variables:

```bash
# Using RabbitMQ (default)
docker-compose up

# Using Kafka
MESSAGE_QUEUE_PROVIDER=kafka MESSAGE_QUEUE_URL=kafka:9092 docker-compose up
```

For more details on the message queue abstraction, see [MESSAGE_QUEUE.md](./MESSAGE_QUEUE.md).

### Development Setup

To set up the development environment for each service:

#### User Service

```bash
cd svc-user
pnpm install
pnpm dev
```

#### Order Service

```bash
cd svc-order
pnpm install
pnpm dev
```

#### Accommodation Service

```bash
cd svc-accommodation
pnpm install
pnpm dev
```

## Service Endpoints

### User Service (port 3000)

- `GET /health`: Health check
- `GET /api/users`: Get all users
- `GET /api/users/:id`: Get user by ID
- `POST /api/users`: Create user
- `PUT /api/users/:id`: Update user

### Order Service (port 3001)

- `GET /health`: Health check
- `GET /api/orders`: Get all orders
- `GET /api/orders/user/:userId`: Get orders by user ID
- `GET /api/orders/:id`: Get order by ID
- `POST /api/orders`: Create order
- `PATCH /api/orders/:id/status`: Update order status
- `PATCH /api/orders/:id/payment`: Update payment status
- `DELETE /api/orders/:id`: Cancel order

### Accommodation Service (port 3002)

- `GET /health`: Health check
- `GET /api/properties`: Get all properties
- `GET /api/properties/:id`: Get property by ID
- `POST /api/properties`: Create property
- `PUT /api/properties/:id`: Update property
- `DELETE /api/properties/:id`: Delete property
- `GET /api/rooms/:id`: Get room by ID
- `POST /api/rooms/property/:propertyId`: Create room for property
- `GET /api/bookings/user/:userId`: Get bookings by user ID
- `POST /api/bookings`: Create booking

For a complete list of endpoints, see the [API Documentation](./API_DOCUMENTATION.md).

## Project Structure

```
luxury-tour-agency/
├── docker-compose.yml        # Docker Compose configuration
├── API_DOCUMENTATION.md      # API documentation
├── ARCHITECTURE.md           # Architecture documentation
├── svc-user/                 # User service
│   ├── src/                  # Source code
│   ├── Dockerfile            # Docker configuration
│   └── package.json          # Dependencies and scripts
├── svc-order/                # Order service
│   ├── src/                  # Source code
│   ├── Dockerfile            # Docker configuration
│   └── package.json          # Dependencies and scripts
└── svc-accommodation/        # Accommodation service
    ├── src/                  # Source code
    ├── Dockerfile            # Docker configuration
    └── package.json          # Dependencies and scripts
```

## Database Schema

Each service has its own database:

### User Service Database

- **users**: User accounts and profiles

### Order Service Database

- **orders**: Order information
- **order_items**: Items within orders

### Accommodation Service Database

- **properties**: Property listings
- **rooms**: Room information
- **availabilities**: Room availability and pricing
- **bookings**: Accommodation bookings
- **images**: Property and room images
- **policies**: Property policies
- **reviews**: Property reviews

## Message Queue

Services communicate asynchronously through the message queue abstraction using the following events:

- **User Events**: USER_CREATED, USER_UPDATED, USER_PREFERENCES_CHANGED
- **Order Events**: ORDER_CREATED, ORDER_STATUS_CHANGED, PAYMENT_PROCESSED, ORDER_CANCELLED
- **Accommodation Events**: PROPERTY_CREATED, PROPERTY_UPDATED, BOOKING_CREATED, BOOKING_CONFIRMED, BOOKING_CANCELLED, AVAILABILITY_CHANGED

The system supports multiple message queue providers:

- **RabbitMQ** (default): A robust and widely-used message broker
- **Kafka**: A distributed streaming platform with high throughput and scalability
- **Mock**: A simple in-memory implementation for testing purposes

The abstraction layer makes it easy to switch between providers or add new ones without changing the application code. For more details, see [MESSAGE_QUEUE.md](./MESSAGE_QUEUE.md).

## Testing

Each service includes unit and integration tests. To run tests:

```bash
cd <service-directory>
pnpm test
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.