import { v4 as uuidv4 } from 'uuid';
import Property from '../models/Property';
import Room from '../models/Room';
import Image from '../models/Image';
import Policy from '../models/Policy';
import Review from '../models/Review';
import { PropertyType, PropertyAttributes, EventType } from '../types/accommodation';
import { publishEvent } from './messageQueue';
import { Transaction } from 'sequelize';
import sequelize from '../models/index';

/**
 * Create a new property
 */
export const createProperty = async (propertyData: Omit<PropertyAttributes, 'id' | 'createdAt' | 'updatedAt'>) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Create property
    const property = await Property.create(
      {
        id: uuidv4(),
        ...propertyData,
      },
      { transaction }
    );
    
    // Create default policy
    await Policy.create(
      {
        id: uuidv4(),
        propertyId: property.id,
        checkInTime: '14:00',
        checkOutTime: '11:00',
        cancellationPolicy: 'Standard 24-hour cancellation policy',
        houseRules: ['No smoking', 'No pets'],
      },
      { transaction }
    );
    
    // Commit transaction
    await transaction.commit();
    
    // Publish event
    await publishEvent({
      type: EventType.PROPERTY_CREATED,
      payload: property,
      timestamp: new Date(),
    });
    
    return property;
  } catch (error) {
    // Rollback transaction on error
    await transaction.rollback();
    throw error;
  }
};

/**
 * Get all properties with optional filtering
 */
export const getProperties = async (filters?: {
  city?: string;
  country?: string;
  type?: PropertyType;
  minRating?: number;
}) => {
  const whereClause: any = {};
  
  if (filters) {
    if (filters.city) {
      whereClause.city = filters.city;
    }
    if (filters.country) {
      whereClause.country = filters.country;
    }
    if (filters.type) {
      whereClause.type = filters.type;
    }
    if (filters.minRating) {
      whereClause.rating = { $gte: filters.minRating };
    }
  }
  
  return Property.findAll({
    where: whereClause,
    include: [
      { model: Policy, as: 'policy' },
      { model: Room, as: 'rooms' },
      { model: Review, as: 'reviews' },
    ],
  });
};

/**
 * Get property by ID
 */
export const getPropertyById = async (id: string) => {
  return Property.findByPk(id, {
    include: [
      { model: Policy, as: 'policy' },
      { model: Room, as: 'rooms', include: [{ model: Image, as: 'images' }] },
      { model: Review, as: 'reviews' },
      { model: Image, as: 'images' },
    ],
  });
};

/**
 * Update property
 */
export const updateProperty = async (
  id: string,
  propertyData: Partial<Omit<PropertyAttributes, 'id' | 'createdAt' | 'updatedAt'>>
) => {
  const transaction = await sequelize.transaction();
  
  try {
    const property = await Property.findByPk(id, { transaction });
    
    if (!property) {
      throw new Error('Property not found');
    }
    
    // Update property
    await property.update(propertyData, { transaction });
    
    // Commit transaction
    await transaction.commit();
    
    // Publish event
    await publishEvent({
      type: EventType.PROPERTY_UPDATED,
      payload: property,
      timestamp: new Date(),
    });
    
    return property;
  } catch (error) {
    // Rollback transaction on error
    await transaction.rollback();
    throw error;
  }
};

/**
 * Delete property
 */
export const deleteProperty = async (id: string) => {
  const transaction = await sequelize.transaction();
  
  try {
    const property = await Property.findByPk(id, { transaction });
    
    if (!property) {
      throw new Error('Property not found');
    }
    
    // Delete property (this will cascade delete related entities)
    await property.destroy({ transaction });
    
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
 * Add review to property
 */
export const addReview = async (
  propertyId: string,
  userId: string,
  rating: number,
  comment: string
) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Create review
    const review = await Review.create(
      {
        id: uuidv4(),
        propertyId,
        userId,
        rating,
        comment,
      },
      { transaction }
    );
    
    // Update property rating
    const property = await Property.findByPk(propertyId, { transaction });
    
    if (!property) {
      throw new Error('Property not found');
    }
    
    // Get all reviews for the property
    const reviews = await Review.findAll({
      where: { propertyId },
      transaction,
    });
    
    // Calculate average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;
    
    // Update property rating
    await property.update({ rating: averageRating }, { transaction });
    
    // Commit transaction
    await transaction.commit();
    
    return review;
  } catch (error) {
    // Rollback transaction on error
    await transaction.rollback();
    throw error;
  }
};