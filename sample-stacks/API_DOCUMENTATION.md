# Luxury Tour Agency Microservices API Documentation

This document provides comprehensive documentation for the Luxury Tour Agency microservices architecture, including API endpoints, message queue events, and integration patterns.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Authentication](#authentication)
3. [User Service API](#user-service-api)
4. [Order Service API](#order-service-api)
5. [Accommodation Service API](#accommodation-service-api)
6. [Message Queue Events](#message-queue-events)
7. [Integration Patterns](#integration-patterns)
8. [Error Handling](#error-handling)

## Architecture Overview

The Luxury Tour Agency backend is built using a microservices architecture with the following components:

- **API Gateway**: Routes client requests to appropriate microservices
- **User Service**: Manages user accounts, profiles, and authentication
- **Order Service**: Handles booking orders, payments, and order history
- **Accommodation Service**: Manages luxury property listings, availability, pricing, and bookings
- **Flight Service** (planned): Will handle flight search, booking, and management
- **Feed Service** (planned): Will provide personalized content, recommendations, and notifications
- **Message Broker (RabbitMQ)**: Facilitates asynchronous communication between services

### Service Communication

Services communicate through:
1. **Synchronous REST APIs**: For direct service-to-service communication
2. **Asynchronous Events**: Via RabbitMQ for event-driven communication

## Authentication

Authentication is handled via JWT tokens. All protected endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## User Service API

Base URL: `http://localhost:3000`

### Endpoints

#### Health Check
```
GET /health
```
Response: `{ "status": "healthy" }`

#### Get All Users
```
GET /api/users
```
Response: Array of user objects

#### Get User by ID
```
GET /api/users/:id
```
Response: User object

#### Create User
```
POST /api/users
```
Request Body:
```json
{
  "name": "string",
  "email": "string"
}
```
Response: Created user object

#### Update User
```
PUT /api/users/:id
```
Request Body:
```json
{
  "name": "string",
  "email": "string"
}
```
Response: Updated user object

## Order Service API

Base URL: `http://localhost:3001`

### Endpoints

#### Health Check
```
GET /health
```
Response: `{ "status": "healthy" }`

#### Get All Orders
```
GET /api/orders
```
Response: Array of order objects with items

#### Get Orders by User ID
```
GET /api/orders/user/:userId
```
Response: Array of order objects with items for the specified user

#### Get Order by ID
```
GET /api/orders/:id
```
Response: Order object with items

#### Create Order
```
POST /api/orders
```
Request Body:
```json
{
  "userId": "string",
  "currency": "string",
  "items": [
    {
      "type": "ACCOMMODATION | FLIGHT | ACTIVITY | PRODUCT",
      "referenceId": "string",
      "name": "string",
      "description": "string",
      "quantity": "number",
      "price": "number",
      "details": {}
    }
  ]
}
```
Response: Created order object with items

#### Update Order Status
```
PATCH /api/orders/:id/status
```
Request Body:
```json
{
  "status": "PENDING | PROCESSING | COMPLETED | CANCELLED"
}
```
Response: Updated order object

#### Update Payment Status
```
PATCH /api/orders/:id/payment
```
Request Body:
```json
{
  "paymentStatus": "PENDING | PAID | REFUNDED | FAILED",
  "paymentDetails": {
    "method": "string",
    "transactionId": "string",
    "paidAt": "string (ISO date)"
  }
}
```
Response: Updated order object

#### Cancel Order
```
DELETE /api/orders/:id
```
Response: Updated order object with CANCELLED status

## Accommodation Service API

Base URL: `http://localhost:3002`

### Endpoints

#### Health Check
```
GET /health
```
Response: `{ "status": "healthy" }`

### Properties

#### Get All Properties
```
GET /api/properties
```
Query Parameters:
- `city`: Filter by city
- `country`: Filter by country
- `type`: Filter by property type (HOTEL, VILLA, RESORT, APARTMENT)
- `minRating`: Filter by minimum rating

Response: Array of property objects with rooms, policies, and reviews

#### Get Property by ID
```
GET /api/properties/:id
```
Response: Property object with rooms, policies, and reviews

#### Create Property
```
POST /api/properties
```
Request Body:
```json
{
  "name": "string",
  "description": "string",
  "type": "HOTEL | VILLA | RESORT | APARTMENT",
  "address": "string",
  "city": "string",
  "state": "string",
  "country": "string",
  "postalCode": "string",
  "latitude": "number",
  "longitude": "number",
  "amenities": ["string"]
}
```
Response: Created property object

#### Update Property
```
PUT /api/properties/:id
```
Request Body: Same as create property (all fields optional)

Response: Updated property object

#### Delete Property
```
DELETE /api/properties/:id
```
Response: 204 No Content

#### Get Rooms for Property
```
GET /api/properties/:id/rooms
```
Response: Array of room objects for the property

#### Get Images for Property
```
GET /api/properties/:id/images
```
Response: Array of image objects for the property

#### Add Image to Property
```
POST /api/properties/:id/images
```
Request Body:
```json
{
  "url": "string",
  "caption": "string",
  "isPrimary": "boolean"
}
```
Response: Created image object

#### Add Review to Property
```
POST /api/properties/:id/reviews
```
Request Body:
```json
{
  "userId": "string",
  "rating": "number (1-5)",
  "comment": "string"
}
```
Response: Created review object

### Rooms

#### Get Room by ID
```
GET /api/rooms/:id
```
Response: Room object with availabilities and images

#### Create Room for Property
```
POST /api/rooms/property/:propertyId
```
Request Body:
```json
{
  "name": "string",
  "description": "string",
  "capacity": "number",
  "bedConfiguration": "string",
  "amenities": ["string"],
  "basePrice": "number"
}
```
Response: Created room object

#### Update Room
```
PUT /api/rooms/:id
```
Request Body: Same as create room (all fields optional)

Response: Updated room object

#### Delete Room
```
DELETE /api/rooms/:id
```
Response: 204 No Content

#### Get Images for Room
```
GET /api/rooms/:id/images
```
Response: Array of image objects for the room

#### Add Image to Room
```
POST /api/rooms/:id/images
```
Request Body:
```json
{
  "url": "string",
  "caption": "string",
  "isPrimary": "boolean"
}
```
Response: Created image object

#### Add Availability for Room
```
POST /api/rooms/:id/availability
```
Request Body:
```json
{
  "date": "string (YYYY-MM-DD)",
  "price": "number",
  "inventory": "number",
  "available": "boolean"
}
```
Response: Created availability object

#### Add Availability Range for Room
```
POST /api/rooms/:id/availability/range
```
Request Body:
```json
{
  "startDate": "string (YYYY-MM-DD)",
  "endDate": "string (YYYY-MM-DD)",
  "price": "number",
  "inventory": "number",
  "available": "boolean"
}
```
Response: Array of created availability objects

#### Check Availability for Room
```
GET /api/rooms/:id/availability/check
```
Query Parameters:
- `checkInDate`: Check-in date (YYYY-MM-DD)
- `checkOutDate`: Check-out date (YYYY-MM-DD)
- `guestCount`: Number of guests

Response:
```json
{
  "available": "boolean",
  "totalPrice": "number",
  "availabilities": ["array of availability objects"]
}
```
or
```json
{
  "available": false,
  "reason": "string"
}
```

### Bookings

#### Get All Bookings for User
```
GET /api/bookings/user/:userId
```
Response: Array of booking objects with property and room details

#### Get Booking by ID
```
GET /api/bookings/:id
```
Response: Booking object with property and room details

#### Create Booking
```
POST /api/bookings
```
Request Body:
```json
{
  "propertyId": "string",
  "roomId": "string",
  "userId": "string",
  "checkInDate": "string (YYYY-MM-DD)",
  "checkOutDate": "string (YYYY-MM-DD)",
  "guestCount": "number",
  "specialRequests": "string"
}
```
Response: Created booking object

#### Update Booking Status
```
PATCH /api/bookings/:id/status
```
Request Body:
```json
{
  "status": "PENDING | CONFIRMED | CANCELLED"
}
```
Response: Updated booking object

#### Confirm Booking with Order ID
```
PATCH /api/bookings/:id/confirm
```
Request Body:
```json
{
  "orderId": "string"
}
```
Response: Updated booking object with CONFIRMED status

#### Cancel Booking
```
DELETE /api/bookings/:id
```
Response: Updated booking object with CANCELLED status

### Images

#### Get Image by ID
```
GET /api/images/:id
```
Response: Image object

#### Update Image
```
PUT /api/images/:id
```
Request Body:
```json
{
  "url": "string",
  "caption": "string",
  "isPrimary": "boolean"
}
```
Response: Updated image object

#### Delete Image
```
DELETE /api/images/:id
```
Response: 204 No Content

## Message Queue Events

The microservices communicate asynchronously through RabbitMQ using the following events:

### User Service Events

- `USER_CREATED`: When a new user is registered
- `USER_UPDATED`: When a user profile is updated
- `USER_PREFERENCES_CHANGED`: When user preferences change

### Order Service Events

- `ORDER_CREATED`: When a new order is created
- `ORDER_STATUS_CHANGED`: When order status changes
- `PAYMENT_PROCESSED`: When payment is processed
- `ORDER_CANCELLED`: When an order is cancelled

### Accommodation Service Events

- `PROPERTY_CREATED`: When a new property is created
- `PROPERTY_UPDATED`: When property details are updated
- `BOOKING_CREATED`: When a new booking is made
- `BOOKING_CONFIRMED`: When a booking is confirmed
- `BOOKING_CANCELLED`: When a booking is cancelled
- `AVAILABILITY_CHANGED`: When room availability changes

## Integration Patterns

### Order Creation Flow

1. User selects accommodation and creates a booking
2. Accommodation service creates a pending booking and publishes `BOOKING_CREATED` event
3. User proceeds to checkout and creates an order
4. Order service creates the order and publishes `ORDER_CREATED` event
5. Order service calls accommodation service to confirm the booking with the order ID
6. Accommodation service confirms the booking and publishes `BOOKING_CONFIRMED` event
7. User completes payment
8. Order service updates payment status and publishes `PAYMENT_PROCESSED` event

### Order Cancellation Flow

1. User cancels an order
2. Order service updates order status to CANCELLED and publishes `ORDER_CANCELLED` event
3. Order service calls accommodation service to cancel the booking
4. Accommodation service cancels the booking, releases inventory, and publishes `BOOKING_CANCELLED` event

## Error Handling

All API endpoints follow a consistent error response format:

```json
{
  "error": "Error message"
}
```

Common HTTP status codes:
- `200 OK`: Request succeeded
- `201 Created`: Resource created successfully
- `204 No Content`: Request succeeded with no response body
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## API Versioning

API versioning is not currently implemented but will be added in future releases using URL path versioning (e.g., `/api/v1/users`).