export enum OrderStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum ItemType {
  ACCOMMODATION = 'ACCOMMODATION',
  FLIGHT = 'FLIGHT',
  ACTIVITY = 'ACTIVITY',
  PRODUCT = 'PRODUCT'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
  FAILED = 'FAILED'
}

export interface OrderItem {
  type: ItemType;
  referenceId: string;
  name: string;
  description?: string;
  quantity: number;
  price: number;
  details?: any;
}

export interface PaymentDetails {
  method: string;
  transactionId: string;
  paidAt: Date;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  currency: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentDetails?: PaymentDetails;
  createdAt: Date;
  updatedAt: Date;
}