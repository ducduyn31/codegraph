import { Router, Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { PropertyType } from '../types/accommodation';
import * as propertyService from '../services/propertyService';
import * as roomService from '../services/roomService';
import * as imageService from '../services/imageService';
import * as reviewService from '../services/reviewService';

const router = Router();

// Type definitions for request parameters
interface PropertyParams extends ParamsDictionary {
  id: string;
}

interface PropertyFilters {
  city?: string;
  country?: string;
  type?: PropertyType;
  minRating?: number;
}

interface CreatePropertyBody {
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
  rating?: number; // Optional since it has a default value of 0 in the model
}

interface UpdatePropertyBody extends Partial<CreatePropertyBody> {}

interface AddReviewBody {
  userId: string;
  rating: number;
  comment: string;
}

// Get all properties with optional filtering
router.get('/', async (req: Request, res: Response) => {
  try {
    const filters: PropertyFilters = {};
    
    if (req.query.city) filters.city = req.query.city as string;
    if (req.query.country) filters.country = req.query.country as string;
    if (req.query.type && Object.values(PropertyType).includes(req.query.type as PropertyType)) {
      filters.type = req.query.type as PropertyType;
    }
    if (req.query.minRating) filters.minRating = parseFloat(req.query.minRating as string);
    
    const properties = await propertyService.getProperties(filters);
    res.json(properties);
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

// Get property by ID
router.get('/:id', async (req: Request<PropertyParams>, res: Response) => {
  try {
    const property = await propertyService.getPropertyById(req.params.id);
    
    if (!property) {
      res.status(404).json({ error: 'Property not found' });
      return;
    }
    
    res.json(property);
  } catch (error) {
    console.error('Error fetching property:', error);
    res.status(500).json({ error: 'Failed to fetch property' });
  }
});

// Create new property
router.post('/', async (req: Request<{}, {}, CreatePropertyBody>, res: Response) => {
  try {
    const propertyData = req.body;
    
    // Validate required fields
    const requiredFields = [
      'name', 'description', 'type', 'address', 'city',
      'state', 'country', 'postalCode', 'latitude', 'longitude'
    ];
    
    for (const field of requiredFields) {
      if (!propertyData[field as keyof CreatePropertyBody]) {
        res.status(400).json({ error: `${field} is required` });
        return;
      }
    }
    
    // Validate property type
    if (!Object.values(PropertyType).includes(propertyData.type)) {
      res.status(400).json({ error: 'Invalid property type' });
      return;
    }
    
    // Ensure rating has a default value if not provided
    const propertyDataWithDefaults = {
      ...propertyData,
      rating: propertyData.rating ?? 0 // Default to 0 if not provided
    };
    
    const property = await propertyService.createProperty(propertyDataWithDefaults);
    res.status(201).json(property);
  } catch (error) {
    console.error('Error creating property:', error);
    res.status(500).json({ error: 'Failed to create property' });
  }
});

// Update property
router.put('/:id', async (req: Request<PropertyParams, {}, UpdatePropertyBody>, res: Response) => {
  try {
    const propertyData = req.body;
    
    // Validate property type if provided
    if (propertyData.type && !Object.values(PropertyType).includes(propertyData.type)) {
      res.status(400).json({ error: 'Invalid property type' });
      return;
    }
    
    const property = await propertyService.updateProperty(req.params.id, propertyData);
    res.json(property);
  } catch (error) {
    console.error('Error updating property:', error);
    
    if ((error as Error).message === 'Property not found') {
      res.status(404).json({ error: 'Property not found' });
    } else {
      res.status(500).json({ error: 'Failed to update property' });
    }
  }
});

// Delete property
router.delete('/:id', async (req: Request<PropertyParams>, res: Response) => {
  try {
    const result = await propertyService.deleteProperty(req.params.id);
    
    if (result) {
      res.status(204).end();
    } else {
      res.status(404).json({ error: 'Property not found' });
    }
  } catch (error) {
    console.error('Error deleting property:', error);
    
    if ((error as Error).message === 'Property not found') {
      res.status(404).json({ error: 'Property not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete property' });
    }
  }
});

// Get rooms for a property
router.get('/:id/rooms', async (req: Request<PropertyParams>, res: Response) => {
  try {
    const property = await propertyService.getPropertyById(req.params.id);
    
    if (!property) {
      res.status(404).json({ error: 'Property not found' });
      return;
    }
    
    const rooms = await roomService.getRoomsByPropertyId(req.params.id);
    res.json(rooms);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// Get images for a property
router.get('/:id/images', async (req: Request<PropertyParams>, res: Response) => {
  try {
    const property = await propertyService.getPropertyById(req.params.id);
    
    if (!property) {
      res.status(404).json({ error: 'Property not found' });
      return;
    }
    
    const images = await imageService.getImages(req.params.id, 'property');
    res.json(images);
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

// Add image to property
router.post('/:id/images', async (req: Request<PropertyParams>, res: Response) => {
  try {
    const { url, caption, isPrimary } = req.body;
    
    if (!url) {
      res.status(400).json({ error: 'URL is required' });
      return;
    }
    
    const property = await propertyService.getPropertyById(req.params.id);
    
    if (!property) {
      res.status(404).json({ error: 'Property not found' });
      return;
    }
    
    const image = await imageService.addImage(
      req.params.id,
      'property',
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

// Add review to property
router.post('/:id/reviews', async (req: Request<PropertyParams, {}, AddReviewBody>, res: Response) => {
  try {
    const { userId, rating, comment } = req.body;
    
    if (!userId || !rating) {
      res.status(400).json({ error: 'User ID and rating are required' });
      return;
    }
    
    if (rating < 1 || rating > 5) {
      res.status(400).json({ error: 'Rating must be between 1 and 5' });
      return;
    }
    
    const review = await propertyService.addReview(
      req.params.id,
      userId,
      rating,
      comment || ''
    );
    
    res.status(201).json(review);
  } catch (error) {
    console.error('Error adding review:', error);
    
    if ((error as Error).message === 'Property not found') {
      res.status(404).json({ error: 'Property not found' });
    } else {
      res.status(500).json({ error: 'Failed to add review' });
    }
  }
});

export default router;