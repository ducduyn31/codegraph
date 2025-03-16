import { Router, Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import * as bookingService from '../services/bookingService';
import { BookingStatus } from '../types/accommodation';

const router = Router();

// Type definitions for request parameters
interface BookingParams extends ParamsDictionary {
  id: string;
}

interface CreateBookingBody {
  propertyId: string;
  roomId: string;
  userId: string;
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  specialRequests?: string;
}

interface UpdateBookingStatusBody {
  status: BookingStatus;
}

interface ConfirmBookingBody {
  orderId: string;
}

// Get all bookings for a user
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const bookings = await bookingService.getBookingsByUserId(req.params.userId);
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Get booking by ID
router.get('/:id', async (req: Request<BookingParams>, res: Response) => {
  try {
    const booking = await bookingService.getBookingById(req.params.id);
    
    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }
    
    res.json(booking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

// Create new booking
router.post('/', async (req: Request<{}, {}, CreateBookingBody>, res: Response) => {
  try {
    const {
      propertyId,
      roomId,
      userId,
      checkInDate,
      checkOutDate,
      guestCount,
      specialRequests,
    } = req.body;
    
    // Validate required fields
    if (!propertyId || !roomId || !userId || !checkInDate || !checkOutDate || !guestCount) {
      res.status(400).json({
        error: 'Property ID, room ID, user ID, check-in date, check-out date, and guest count are required',
      });
      return;
    }
    
    // Validate dates
    const checkInDateObj = new Date(checkInDate);
    const checkOutDateObj = new Date(checkOutDate);
    
    if (isNaN(checkInDateObj.getTime()) || isNaN(checkOutDateObj.getTime())) {
      res.status(400).json({ error: 'Invalid date format' });
      return;
    }
    
    if (checkInDateObj >= checkOutDateObj) {
      res.status(400).json({ error: 'Check-out date must be after check-in date' });
      return;
    }
    
    // Validate guest count
    if (typeof guestCount !== 'number' || guestCount <= 0) {
      res.status(400).json({ error: 'Guest count must be a positive number' });
      return;
    }
    
    const booking = await bookingService.createBooking(
      propertyId,
      roomId,
      userId,
      checkInDateObj,
      checkOutDateObj,
      guestCount,
      specialRequests
    );
    
    res.status(201).json(booking);
  } catch (error) {
    console.error('Error creating booking:', error);
    
    if ((error as Error).message.includes('not found')) {
      res.status(404).json({ error: (error as Error).message });
    } else if ((error as Error).message.includes('not available')) {
      res.status(400).json({ error: (error as Error).message });
    } else {
      res.status(500).json({ error: 'Failed to create booking' });
    }
  }
});

// Update booking status
router.patch('/:id/status', async (req: Request<BookingParams, {}, UpdateBookingStatusBody>, res: Response) => {
  try {
    const { status } = req.body;
    
    if (!status || !Object.values(BookingStatus).includes(status)) {
      res.status(400).json({ error: 'Valid status is required' });
      return;
    }
    
    const booking = await bookingService.updateBookingStatus(req.params.id, status);
    res.json(booking);
  } catch (error) {
    console.error('Error updating booking status:', error);
    
    if ((error as Error).message === 'Booking not found') {
      res.status(404).json({ error: 'Booking not found' });
    } else {
      res.status(500).json({ error: 'Failed to update booking status' });
    }
  }
});

// Confirm booking with order ID
router.patch('/:id/confirm', async (req: Request<BookingParams, {}, ConfirmBookingBody>, res: Response) => {
  try {
    const { orderId } = req.body;
    
    if (!orderId) {
      res.status(400).json({ error: 'Order ID is required' });
      return;
    }
    
    const booking = await bookingService.confirmBooking(req.params.id, orderId);
    res.json(booking);
  } catch (error) {
    console.error('Error confirming booking:', error);
    
    if ((error as Error).message === 'Booking not found') {
      res.status(404).json({ error: 'Booking not found' });
    } else {
      res.status(500).json({ error: 'Failed to confirm booking' });
    }
  }
});

// Cancel booking
router.delete('/:id', async (req: Request<BookingParams>, res: Response) => {
  try {
    const booking = await bookingService.cancelBooking(req.params.id);
    res.json(booking);
  } catch (error) {
    console.error('Error cancelling booking:', error);
    
    if ((error as Error).message === 'Booking not found') {
      res.status(404).json({ error: 'Booking not found' });
    } else {
      res.status(500).json({ error: 'Failed to cancel booking' });
    }
  }
});

export default router;