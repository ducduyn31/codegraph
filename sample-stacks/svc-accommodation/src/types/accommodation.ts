export enum PropertyType {
  HOTEL = 'HOTEL',
  VILLA = 'VILLA',
  RESORT = 'RESORT',
  APARTMENT = 'APARTMENT'
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED'
}

export interface PropertyAttributes {
  id: string;
  name: string;
  description: string;
  type: PropertyType;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  amenities: string[];
  rating: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RoomAttributes {
  id: string;
  propertyId: string;
  name: string;
  description: string;
  capacity: number;
  bedConfiguration: string;
  amenities: string[];
  basePrice: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ImageAttributes {
  id: string;
  referenceId: string; // propertyId or roomId
  referenceType: string; // 'property' or 'room'
  url: string;
  caption: string;
  isPrimary: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AvailabilityAttributes {
  id: string;
  roomId: string;
  date: Date;
  available: boolean;
  price: number;
  inventory: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PolicyAttributes {
  id: string;
  propertyId: string;
  checkInTime: string;
  checkOutTime: string;
  cancellationPolicy: string;
  houseRules: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ReviewAttributes {
  id: string;
  propertyId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BookingAttributes {
  id: string;
  propertyId: string;
  roomId: string;
  userId: string;
  orderId: string | null;
  checkInDate: Date;
  checkOutDate: Date;
  guestCount: number;
  totalPrice: number;
  status: BookingStatus;
  specialRequests: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Event types for message queue
export enum EventType {
  PROPERTY_CREATED = 'PROPERTY_CREATED',
  PROPERTY_UPDATED = 'PROPERTY_UPDATED',
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