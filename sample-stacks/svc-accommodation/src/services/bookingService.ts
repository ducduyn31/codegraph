import { v4 as uuidv4 } from 'uuid';
import Booking from '../models/Booking';
import Room from '../models/Room';
import Property from '../models/Property';
import Availability from '../models/Availability';
import { BookingStatus, EventType, BookingAttributes } from '../types/accommodation';
import { publishEvent } from './messageQueue';
import { Transaction } from 'sequelize';
import sequelize from '../models/index';
import { checkAvailability } from './roomService';

/**
 * Create a new booking
 */
export const createBooking = async (
  propertyId: string,
  roomId: string,
  userId: string,
  checkInDate: Date,
  checkOutDate: Date,
  guestCount: number,
  specialRequests: string = ''
) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Check if property exists
    const property = await Property.findByPk(propertyId, { transaction });
    
    if (!property) {
      throw new Error('Property not found');
    }
    
    // Check if room exists
    const room = await Room.findByPk(roomId, { transaction });
    
    if (!room) {
      throw new Error('Room not found');
    }
    
    // Check availability
    const availabilityCheck = await checkAvailability(
      roomId,
      checkInDate,
      checkOutDate,
      guestCount
    );
    
    if (!availabilityCheck.available) {
      throw new Error(availabilityCheck.reason || 'Room is not available for the selected dates');
    }
    
    // Create booking
    const booking = await Booking.create(
      {
        id: uuidv4(),
        propertyId,
        roomId,
        userId,
        orderId: null, // Will be set when order is created
        checkInDate,
        checkOutDate,
        guestCount,
        totalPrice: availabilityCheck.totalPrice ?? 0, // Ensure totalPrice is never undefined
        status: BookingStatus.PENDING,
        specialRequests,
      },
      { transaction }
    );
    
    // Update availability inventory
    if (availabilityCheck.availabilities) {
      for (const availability of availabilityCheck.availabilities) {
        await availability.update(
          {
            inventory: availability.inventory - 1,
            available: availability.inventory - 1 > 0,
          },
          { transaction }
        );
      }
    }
    
    // Commit transaction
    await transaction.commit();
    
    // Publish event
    await publishEvent({
      type: EventType.BOOKING_CREATED,
      payload: booking,
      timestamp: new Date(),
    });
    
    return booking;
  } catch (error) {
    // Rollback transaction on error
    await transaction.rollback();
    throw error;
  }
};

/**
 * Get all bookings for a user
 */
export const getBookingsByUserId = async (userId: string) => {
  return Booking.findAll({
    where: { userId },
    include: [
      { model: Property, as: 'property' },
      { model: Room, as: 'room' },
    ],
  });
};

/**
 * Get booking by ID
 */
export const getBookingById = async (id: string) => {
  return Booking.findByPk(id, {
    include: [
      { model: Property, as: 'property' },
      { model: Room, as: 'room' },
    ],
  });
};

/**
 * Update booking status
 */
export const updateBookingStatus = async (id: string, status: BookingStatus) => {
  const transaction = await sequelize.transaction();
  
  try {
    const booking = await Booking.findByPk(id, { transaction });
    
    if (!booking) {
      throw new Error('Booking not found');
    }
    
    // Update booking status
    await booking.update({ status }, { transaction });
    
    // Commit transaction
    await transaction.commit();
    
    // Publish event based on status
    let eventType: EventType;
    
    switch (status) {
      case BookingStatus.CONFIRMED:
        eventType = EventType.BOOKING_CONFIRMED;
        break;
      case BookingStatus.CANCELLED:
        eventType = EventType.BOOKING_CANCELLED;
        
        // If cancelled, release inventory
        if (booking.status !== BookingStatus.CANCELLED) {
          await releaseBookingInventory(booking.id);
        }
        break;
      default:
        eventType = EventType.BOOKING_CREATED;
    }
    
    await publishEvent({
      type: eventType,
      payload: booking,
      timestamp: new Date(),
    });
    
    return booking;
  } catch (error) {
    // Rollback transaction on error
    await transaction.rollback();
    throw error;
  }
};

/**
 * Cancel booking
 */
export const cancelBooking = async (id: string) => {
  return updateBookingStatus(id, BookingStatus.CANCELLED);
};

/**
 * Confirm booking
 */
export const confirmBooking = async (id: string, orderId: string) => {
  const transaction = await sequelize.transaction();
  
  try {
    const booking = await Booking.findByPk(id, { transaction });
    
    if (!booking) {
      throw new Error('Booking not found');
    }
    
    // Update booking status and orderId
    await booking.update(
      {
        status: BookingStatus.CONFIRMED,
        orderId,
      },
      { transaction }
    );
    
    // Commit transaction
    await transaction.commit();
    
    // Publish event
    await publishEvent({
      type: EventType.BOOKING_CONFIRMED,
      payload: booking,
      timestamp: new Date(),
    });
    
    return booking;
  } catch (error) {
    // Rollback transaction on error
    await transaction.rollback();
    throw error;
  }
};

/**
 * Release inventory for a cancelled booking
 */
export const releaseBookingInventory = async (bookingId: string) => {
  const transaction = await sequelize.transaction();
  
  try {
    const booking = await Booking.findByPk(bookingId, { transaction });
    
    if (!booking) {
      throw new Error('Booking not found');
    }
    
    // Get dates between checkInDate and checkOutDate
    const dates: Date[] = [];
    const currentDate = new Date(booking.checkInDate);
    
    while (currentDate < booking.checkOutDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Get availabilities for these dates
    const availabilities = await Availability.findAll({
      where: {
        roomId: booking.roomId,
        date: dates,
      },
      transaction,
    });
    
    // Update availabilities to increase inventory if any exist
    if (availabilities.length > 0) {
      for (const availability of availabilities) {
        await availability.update(
          {
            inventory: availability.inventory + 1,
            available: true,
          },
          { transaction }
        );
      }
      
      // Commit transaction
      await transaction.commit();
      
      // Publish event for each availability
      for (const availability of availabilities) {
        await publishEvent({
          type: EventType.AVAILABILITY_CHANGED,
          payload: availability,
          timestamp: new Date(),
        });
      }
    } else {
      // Commit transaction even if no availabilities found
      await transaction.commit();
    }
    
    return true;
  } catch (error) {
    // Rollback transaction on error
    await transaction.rollback();
    throw error;
  }
};