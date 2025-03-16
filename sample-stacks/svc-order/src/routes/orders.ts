import { Router, Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { OrderStatus, PaymentStatus, ItemType, OrderItem as OrderItemType } from '../types/order';
import Order from '../models/Order';
import OrderItem from '../models/OrderItem';
import { Transaction } from 'sequelize';
import sequelize from '../models/index';
import axios from 'axios';

const router = Router();

// Configuration
const ACCOMMODATION_SERVICE_URL = process.env.ACCOMMODATION_SERVICE_URL || 'http://svc-accommodation:3002';
const FLIGHT_SERVICE_URL = process.env.FLIGHT_SERVICE_URL || 'http://svc-flight:3003';

interface CreateOrderBody {
  userId: string;
  items: OrderItemType[];
  currency?: string;
}

interface UpdateOrderStatusBody {
  status: OrderStatus;
}

interface UpdatePaymentStatusBody {
  paymentStatus: PaymentStatus;
  paymentDetails?: {
    method: string;
    transactionId: string;
    paidAt: string;
  };
}

interface OrderParams extends ParamsDictionary {
  id: string;
}

// Get all orders
router.get('/', async (_req: Request, res: Response) => {
  try {
    const orders = await Order.findAll({
      include: [{ model: OrderItem, as: 'items' }]
    });
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get orders by user ID
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const orders = await Order.findAll({
      where: { userId: req.params.userId },
      include: [{ model: OrderItem, as: 'items' }]
    });
    res.json(orders);
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ error: 'Failed to fetch user orders' });
  }
});

// Get order by ID
router.get('/:id', async (req: Request<OrderParams>, res: Response) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [{ model: OrderItem, as: 'items' }]
    });
    
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    
    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Create new order
router.post('/', async (req: Request<{}, {}, CreateOrderBody>, res: Response) => {
  let transaction: Transaction | undefined;
  
  try {
    const { userId, items, currency = 'USD' } = req.body;
    
    if (!userId || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Invalid order data' });
      return;
    }

    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Start transaction
    transaction = await sequelize.transaction();
    
    // Create order
    const order = await Order.create({
      userId,
      totalAmount,
      currency,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING
    }, { transaction });
    
    // Create order items
    const orderItems = await Promise.all(
      items.map(item => OrderItem.create({
        orderId: order.id,
        type: item.type,
        referenceId: item.referenceId,
        name: item.name,
        description: item.description || '',
        quantity: item.quantity,
        price: item.price,
        details: item.details || {}
      }, { transaction }))
    );
    
    // Commit transaction
    await transaction.commit();
    
    // Process service-specific actions
    await processOrderItems(order.id, items);
    
    // Return created order with items
    res.status(201).json({
      ...order.toJSON(),
      items: orderItems
    });
  } catch (error) {
    // Rollback transaction on error
    if (transaction) await transaction.rollback();
    
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Process order items with service-specific actions
async function processOrderItems(orderId: string, items: OrderItemType[]) {
  try {
    // Group items by type
    const accommodationItems = items.filter(item => item.type === ItemType.ACCOMMODATION);
    const flightItems = items.filter(item => item.type === ItemType.FLIGHT);
    
    // Process accommodation bookings
    for (const item of accommodationItems) {
      try {
        // Confirm booking with accommodation service
        await axios.patch(`${ACCOMMODATION_SERVICE_URL}/api/bookings/${item.referenceId}/confirm`, {
          orderId
        });
        
        console.log(`Confirmed accommodation booking: ${item.referenceId}`);
      } catch (error) {
        console.error(`Error confirming accommodation booking ${item.referenceId}:`, error);
        // Continue processing other items even if one fails
      }
    }
    
    // Process flight bookings
    for (const item of flightItems) {
      try {
        // Confirm booking with flight service
        await axios.patch(`${FLIGHT_SERVICE_URL}/api/flight-bookings/${item.referenceId}/confirm`, {
          orderId
        });
        
        console.log(`Confirmed flight booking: ${item.referenceId}`);
      } catch (error) {
        console.error(`Error confirming flight booking ${item.referenceId}:`, error);
        // Continue processing other items even if one fails
      }
    }
  } catch (error) {
    console.error('Error processing order items:', error);
    // Don't throw error to avoid affecting the main order creation flow
  }
}

// Update order status
router.patch('/:id/status', async (req: Request<OrderParams, {}, UpdateOrderStatusBody>, res: Response) => {
  try {
    const { status } = req.body;
    
    if (!Object.values(OrderStatus).includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }
    
    const order = await Order.findByPk(req.params.id, {
      include: [{ model: OrderItem, as: 'items' }]
    });
    
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    
    // Update order status
    order.status = status;
    await order.save();
    
    // If order is cancelled, cancel all related bookings
    if (status === OrderStatus.CANCELLED) {
      await cancelOrderItems(order);
    }
    
    res.json(order);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Update payment status
router.patch('/:id/payment', async (req: Request<OrderParams, {}, UpdatePaymentStatusBody>, res: Response) => {
  try {
    const { paymentStatus, paymentDetails } = req.body;
    
    if (!Object.values(PaymentStatus).includes(paymentStatus)) {
      res.status(400).json({ error: 'Invalid payment status' });
      return;
    }
    
    const order = await Order.findByPk(req.params.id);
    
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    
    // Update payment status
    order.paymentStatus = paymentStatus;
    
    // Update payment details if provided
    if (paymentDetails) {
      order.paymentDetails = {
        method: paymentDetails.method,
        transactionId: paymentDetails.transactionId,
        paidAt: new Date(paymentDetails.paidAt)
      };
    }
    
    await order.save();
    
    // If payment is successful, update order status to PROCESSING
    if (paymentStatus === PaymentStatus.PAID && order.status === OrderStatus.PENDING) {
      order.status = OrderStatus.PROCESSING;
      await order.save();
    }
    
    res.json(order);
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ error: 'Failed to update payment status' });
  }
});

// Cancel order
router.delete('/:id', async (req: Request<OrderParams>, res: Response) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [{ model: OrderItem, as: 'items' }]
    });
    
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    
    if (order.status === OrderStatus.COMPLETED) {
      res.status(400).json({ error: 'Cannot cancel completed order' });
      return;
    }
    
    // Update order status
    order.status = OrderStatus.CANCELLED;
    await order.save();
    
    // Cancel all related bookings
    await cancelOrderItems(order);
    
    res.json(order);
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

// Cancel all items in an order
async function cancelOrderItems(order: any) {
  try {
    const items = order.items || [];
    
    // Group items by type
    const accommodationItems = items.filter((item: any) => item.type === ItemType.ACCOMMODATION);
    const flightItems = items.filter((item: any) => item.type === ItemType.FLIGHT);
    
    // Cancel accommodation bookings
    for (const item of accommodationItems) {
      try {
        await axios.delete(`${ACCOMMODATION_SERVICE_URL}/api/bookings/${item.referenceId}`);
        console.log(`Cancelled accommodation booking: ${item.referenceId}`);
      } catch (error) {
        console.error(`Error cancelling accommodation booking ${item.referenceId}:`, error);
      }
    }
    
    // Cancel flight bookings
    for (const item of flightItems) {
      try {
        await axios.delete(`${FLIGHT_SERVICE_URL}/api/flight-bookings/${item.referenceId}`);
        console.log(`Cancelled flight booking: ${item.referenceId}`);
      } catch (error) {
        console.error(`Error cancelling flight booking ${item.referenceId}:`, error);
      }
    }
  } catch (error) {
    console.error('Error cancelling order items:', error);
  }
}

export default router;