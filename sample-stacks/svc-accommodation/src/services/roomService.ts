import { v4 as uuidv4 } from 'uuid';
import Room from '../models/Room';
import Availability from '../models/Availability';
import Image from '../models/Image';
import Property from '../models/Property';
import { RoomAttributes, EventType } from '../types/accommodation';
import { publishEvent } from './messageQueue';
import { Transaction } from 'sequelize';
import sequelize from '../models/index';

/**
 * Create a new room for a property
 */
export const createRoom = async (
  propertyId: string,
  roomData: Omit<RoomAttributes, 'id' | 'propertyId' | 'createdAt' | 'updatedAt'>
) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Check if property exists
    const property = await Property.findByPk(propertyId, { transaction });
    
    if (!property) {
      throw new Error('Property not found');
    }
    
    // Create room
    const room = await Room.create(
      {
        id: uuidv4(),
        propertyId,
        ...roomData,
      },
      { transaction }
    );
    
    // Commit transaction
    await transaction.commit();
    
    return room;
  } catch (error) {
    // Rollback transaction on error
    await transaction.rollback();
    throw error;
  }
};

/**
 * Get all rooms for a property
 */
export const getRoomsByPropertyId = async (propertyId: string) => {
  return Room.findAll({
    where: { propertyId },
    include: [
      { model: Image, as: 'images' },
      { model: Availability, as: 'availabilities' },
    ],
  });
};

/**
 * Get room by ID
 */
export const getRoomById = async (id: string) => {
  return Room.findByPk(id, {
    include: [
      { model: Image, as: 'images' },
      { model: Availability, as: 'availabilities' },
    ],
  });
};

/**
 * Update room
 */
export const updateRoom = async (
  id: string,
  roomData: Partial<Omit<RoomAttributes, 'id' | 'propertyId' | 'createdAt' | 'updatedAt'>>
) => {
  const transaction = await sequelize.transaction();
  
  try {
    const room = await Room.findByPk(id, { transaction });
    
    if (!room) {
      throw new Error('Room not found');
    }
    
    // Update room
    await room.update(roomData, { transaction });
    
    // Commit transaction
    await transaction.commit();
    
    return room;
  } catch (error) {
    // Rollback transaction on error
    await transaction.rollback();
    throw error;
  }
};

/**
 * Delete room
 */
export const deleteRoom = async (id: string) => {
  const transaction = await sequelize.transaction();
  
  try {
    const room = await Room.findByPk(id, { transaction });
    
    if (!room) {
      throw new Error('Room not found');
    }
    
    // Delete room (this will cascade delete related entities)
    await room.destroy({ transaction });
    
    // Commit transaction
    await transaction.commit();
    
    return true;
  } catch (error) {
    // Rollback transaction on error
    await transaction.rollback();
    throw error;
  }
};

/**
 * Add availability for a room
 */
export const addAvailability = async (
  roomId: string,
  date: Date,
  price: number,
  inventory: number = 1,
  available: boolean = true
) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Check if room exists
    const room = await Room.findByPk(roomId, { transaction });
    
    if (!room) {
      throw new Error('Room not found');
    }
    
    // Check if availability already exists for this date
    const existingAvailability = await Availability.findOne({
      where: { roomId, date },
      transaction,
    });
    
    if (existingAvailability) {
      // Update existing availability
      await existingAvailability.update(
        { price, inventory, available },
        { transaction }
      );
      
      // Commit transaction
      await transaction.commit();
      
      // Publish event
      await publishEvent({
        type: EventType.AVAILABILITY_CHANGED,
        payload: existingAvailability,
        timestamp: new Date(),
      });
      
      return existingAvailability;
    } else {
      // Create new availability
      const availability = await Availability.create(
        {
          id: uuidv4(),
          roomId,
          date,
          price,
          inventory,
          available,
        },
        { transaction }
      );
      
      // Commit transaction
      await transaction.commit();
      
      // Publish event
      await publishEvent({
        type: EventType.AVAILABILITY_CHANGED,
        payload: availability,
        timestamp: new Date(),
      });
      
      return availability;
    }
  } catch (error) {
    // Rollback transaction on error
    await transaction.rollback();
    throw error;
  }
};

/**
 * Add availability for a room for a date range
 */
export const addAvailabilityRange = async (
  roomId: string,
  startDate: Date,
  endDate: Date,
  price: number,
  inventory: number = 1,
  available: boolean = true
) => {
  // Create an array of dates between startDate and endDate
  const dates: Date[] = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Add availability for each date
  const availabilities = [];
  
  for (const date of dates) {
    const availability = await addAvailability(roomId, date, price, inventory, available);
    availabilities.push(availability);
  }
  
  return availabilities;
};

/**
 * Check availability for a room for a date range
 */
export const checkAvailability = async (
  roomId: string,
  checkInDate: Date,
  checkOutDate: Date,
  guestCount: number
) => {
  // Create an array of dates between checkInDate and checkOutDate (exclusive of checkOutDate)
  const dates: Date[] = [];
  const currentDate = new Date(checkInDate);
  
  while (currentDate < checkOutDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Get room details
  const room = await Room.findByPk(roomId);
  
  if (!room) {
    throw new Error('Room not found');
  }
  
  // Check if room capacity is sufficient
  if (room.capacity < guestCount) {
    return {
      available: false,
      reason: 'Room capacity is insufficient for the number of guests',
    };
  }
  
  // Check availability for each date
  const availabilities = await Availability.findAll({
    where: {
      roomId,
      date: dates,
    },
  });
  
  // Check if all dates have availability
  if (availabilities.length !== dates.length) {
    return {
      available: false,
      reason: 'Room is not available for all requested dates',
    };
  }
  
  // Check if all availabilities have inventory and are available
  for (const availability of availabilities) {
    if (!availability.available || availability.inventory <= 0) {
      return {
        available: false,
        reason: `Room is not available on ${availability.date.toISOString().split('T')[0]}`,
      };
    }
  }
  
  // Calculate total price
  const totalPrice = availabilities.reduce((sum, availability) => sum + availability.price, 0);
  
  return {
    available: true,
    totalPrice,
    availabilities,
  };
};