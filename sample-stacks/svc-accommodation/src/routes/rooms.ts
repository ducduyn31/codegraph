import { Router, Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import * as roomService from '../services/roomService';
import * as imageService from '../services/imageService';
import { RoomAttributes } from '../types/accommodation';

const router = Router();

// Type definitions for request parameters
interface RoomParams extends ParamsDictionary {
  id: string;
}

interface PropertyRoomParams extends ParamsDictionary {
  propertyId: string;
}

interface CreateRoomBody {
  name: string;
  description: string;
  capacity: number;
  bedConfiguration: string;
  amenities: string[];
  basePrice: number;
}

interface UpdateRoomBody extends Partial<CreateRoomBody> {}

interface AvailabilityBody {
  date: string;
  price: number;
  inventory?: number;
  available?: boolean;
}

interface AvailabilityRangeBody {
  startDate: string;
  endDate: string;
  price: number;
  inventory?: number;
  available?: boolean;
}

interface CheckAvailabilityQuery {
  checkInDate: string;
  checkOutDate: string;
  guestCount: string;
}

// Get room by ID
router.get('/:id', async (req: Request<RoomParams>, res: Response) => {
  try {
    const room = await roomService.getRoomById(req.params.id);
    
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    
    res.json(room);
  } catch (error) {
    console.error('Error fetching room:', error);
    res.status(500).json({ error: 'Failed to fetch room' });
  }
});

// Create room for a property
router.post('/property/:propertyId', async (req: Request<PropertyRoomParams, {}, CreateRoomBody>, res: Response) => {
  try {
    const roomData = req.body;
    
    // Validate required fields
    const requiredFields = ['name', 'description', 'capacity', 'bedConfiguration', 'basePrice'];
    
    for (const field of requiredFields) {
      if (!roomData[field as keyof CreateRoomBody]) {
        res.status(400).json({ error: `${field} is required` });
        return;
      }
    }
    
    // Validate numeric fields
    if (typeof roomData.capacity !== 'number' || roomData.capacity <= 0) {
      res.status(400).json({ error: 'Capacity must be a positive number' });
      return;
    }
    
    if (typeof roomData.basePrice !== 'number' || roomData.basePrice <= 0) {
      res.status(400).json({ error: 'Base price must be a positive number' });
      return;
    }
    
    const room = await roomService.createRoom(req.params.propertyId, roomData);
    res.status(201).json(room);
  } catch (error) {
    console.error('Error creating room:', error);
    
    if ((error as Error).message === 'Property not found') {
      res.status(404).json({ error: 'Property not found' });
    } else {
      res.status(500).json({ error: 'Failed to create room' });
    }
  }
});

// Update room
router.put('/:id', async (req: Request<RoomParams, {}, UpdateRoomBody>, res: Response) => {
  try {
    const roomData = req.body;
    
    // Validate numeric fields if provided
    if (roomData.capacity !== undefined && (typeof roomData.capacity !== 'number' || roomData.capacity <= 0)) {
      res.status(400).json({ error: 'Capacity must be a positive number' });
      return;
    }
    
    if (roomData.basePrice !== undefined && (typeof roomData.basePrice !== 'number' || roomData.basePrice <= 0)) {
      res.status(400).json({ error: 'Base price must be a positive number' });
      return;
    }
    
    const room = await roomService.updateRoom(req.params.id, roomData);
    res.json(room);
  } catch (error) {
    console.error('Error updating room:', error);
    
    if ((error as Error).message === 'Room not found') {
      res.status(404).json({ error: 'Room not found' });
    } else {
      res.status(500).json({ error: 'Failed to update room' });
    }
  }
});

// Delete room
router.delete('/:id', async (req: Request<RoomParams>, res: Response) => {
  try {
    const result = await roomService.deleteRoom(req.params.id);
    
    if (result) {
      res.status(204).end();
    } else {
      res.status(404).json({ error: 'Room not found' });
    }
  } catch (error) {
    console.error('Error deleting room:', error);
    
    if ((error as Error).message === 'Room not found') {
      res.status(404).json({ error: 'Room not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete room' });
    }
  }
});

// Get images for a room
router.get('/:id/images', async (req: Request<RoomParams>, res: Response) => {
  try {
    const room = await roomService.getRoomById(req.params.id);
    
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    
    const images = await imageService.getImages(req.params.id, 'room');
    res.json(images);
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

// Add image to room
router.post('/:id/images', async (req: Request<RoomParams>, res: Response) => {
  try {
    const { url, caption, isPrimary } = req.body;
    
    if (!url) {
      res.status(400).json({ error: 'URL is required' });
      return;
    }
    
    const room = await roomService.getRoomById(req.params.id);
    
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    
    const image = await imageService.addImage(
      req.params.id,
      'room',
      url,
      caption,
      isPrimary
    );
    
    res.status(201).json(image);
  } catch (error) {
    console.error('Error adding image:', error);
    res.status(500).json({ error: 'Failed to add image' });
  }
});

// Add availability for a room
router.post('/:id/availability', async (req: Request<RoomParams, {}, AvailabilityBody>, res: Response) => {
  try {
    const { date, price, inventory, available } = req.body;
    
    if (!date || !price) {
      res.status(400).json({ error: 'Date and price are required' });
      return;
    }
    
    if (typeof price !== 'number' || price <= 0) {
      res.status(400).json({ error: 'Price must be a positive number' });
      return;
    }
    
    const dateObj = new Date(date);
    
    if (isNaN(dateObj.getTime())) {
      res.status(400).json({ error: 'Invalid date format' });
      return;
    }
    
    const availability = await roomService.addAvailability(
      req.params.id,
      dateObj,
      price,
      inventory,
      available
    );
    
    res.status(201).json(availability);
  } catch (error) {
    console.error('Error adding availability:', error);
    
    if ((error as Error).message === 'Room not found') {
      res.status(404).json({ error: 'Room not found' });
    } else {
      res.status(500).json({ error: 'Failed to add availability' });
    }
  }
});

// Add availability range for a room
router.post('/:id/availability/range', async (req: Request<RoomParams, {}, AvailabilityRangeBody>, res: Response) => {
  try {
    const { startDate, endDate, price, inventory, available } = req.body;
    
    if (!startDate || !endDate || !price) {
      res.status(400).json({ error: 'Start date, end date, and price are required' });
      return;
    }
    
    if (typeof price !== 'number' || price <= 0) {
      res.status(400).json({ error: 'Price must be a positive number' });
      return;
    }
    
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      res.status(400).json({ error: 'Invalid date format' });
      return;
    }
    
    if (startDateObj >= endDateObj) {
      res.status(400).json({ error: 'End date must be after start date' });
      return;
    }
    
    const availabilities = await roomService.addAvailabilityRange(
      req.params.id,
      startDateObj,
      endDateObj,
      price,
      inventory,
      available
    );
    
    res.status(201).json(availabilities);
  } catch (error) {
    console.error('Error adding availability range:', error);
    
    if ((error as Error).message === 'Room not found') {
      res.status(404).json({ error: 'Room not found' });
    } else {
      res.status(500).json({ error: 'Failed to add availability range' });
    }
  }
});

// Check availability for a room
router.get('/:id/availability/check', async (req: Request<RoomParams, {}, {}, CheckAvailabilityQuery>, res: Response) => {
  try {
    const { checkInDate, checkOutDate, guestCount } = req.query;
    
    if (!checkInDate || !checkOutDate || !guestCount) {
      res.status(400).json({ error: 'Check-in date, check-out date, and guest count are required' });
      return;
    }
    
    const checkInDateObj = new Date(checkInDate);
    const checkOutDateObj = new Date(checkOutDate);
    const guestCountNum = parseInt(guestCount, 10);
    
    if (isNaN(checkInDateObj.getTime()) || isNaN(checkOutDateObj.getTime())) {
      res.status(400).json({ error: 'Invalid date format' });
      return;
    }
    
    if (isNaN(guestCountNum) || guestCountNum <= 0) {
      res.status(400).json({ error: 'Guest count must be a positive number' });
      return;
    }
    
    if (checkInDateObj >= checkOutDateObj) {
      res.status(400).json({ error: 'Check-out date must be after check-in date' });
      return;
    }
    
    const availability = await roomService.checkAvailability(
      req.params.id,
      checkInDateObj,
      checkOutDateObj,
      guestCountNum
    );
    
    res.json(availability);
  } catch (error) {
    console.error('Error checking availability:', error);
    
    if ((error as Error).message === 'Room not found') {
      res.status(404).json({ error: 'Room not found' });
    } else {
      res.status(500).json({ error: 'Failed to check availability' });
    }
  }
});

export default router;