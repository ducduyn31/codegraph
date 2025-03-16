import { v4 as uuidv4 } from 'uuid';
import Review from '../models/Review';
import Property from '../models/Property';
import { ReviewAttributes } from '../types/accommodation';
import { Transaction } from 'sequelize';
import sequelize from '../models/index';

/**
 * Add a review to a property
 */
export const addReview = async (
  propertyId: string,
  userId: string,
  rating: number,
  comment: string
) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Check if property exists
    const property = await Property.findByPk(propertyId, { transaction });
    
    if (!property) {
      throw new Error('Property not found');
    }
    
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

/**
 * Get all reviews for a property
 */
export const getReviewsByPropertyId = async (propertyId: string) => {
  return Review.findAll({
    where: { propertyId },
    order: [['createdAt', 'DESC']],
  });
};

/**
 * Get review by ID
 */
export const getReviewById = async (id: string) => {
  return Review.findByPk(id);
};

/**
 * Update review
 */
export const updateReview = async (
  id: string,
  reviewData: Partial<Omit<ReviewAttributes, 'id' | 'propertyId' | 'userId' | 'createdAt' | 'updatedAt'>>
) => {
  const transaction = await sequelize.transaction();
  
  try {
    const review = await Review.findByPk(id, { transaction });
    
    if (!review) {
      throw new Error('Review not found');
    }
    
    // Update review
    await review.update(reviewData, { transaction });
    
    // If rating was updated, update property rating
    if (reviewData.rating) {
      const property = await Property.findByPk(review.propertyId, { transaction });
      
      if (!property) {
        throw new Error('Property not found');
      }
      
      const reviews = await Review.findAll({
        where: { propertyId: review.propertyId },
        transaction,
      });
      
      // Calculate average rating
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = totalRating / reviews.length;
      
      // Update property rating
      await property.update({ rating: averageRating }, { transaction });
    }
    
    // Commit transaction
    await transaction.commit();
    
    return review;
  } catch (error) {
    // Rollback transaction on error
    await transaction.rollback();
    throw error;
  }
};

/**
 * Delete review
 */
export const deleteReview = async (id: string) => {
  const transaction = await sequelize.transaction();
  
  try {
    const review = await Review.findByPk(id, { transaction });
    
    if (!review) {
      throw new Error('Review not found');
    }
    
    const propertyId = review.propertyId;
    
    // Delete review
    await review.destroy({ transaction });
    
    // Update property rating
    const property = await Property.findByPk(propertyId, { transaction });
    
    if (property) {
      const reviews = await Review.findAll({
        where: { propertyId },
        transaction,
      });
      
      // Calculate average rating or set to 0 if no reviews
      let averageRating = 0;
      
      if (reviews.length > 0) {
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        averageRating = totalRating / reviews.length;
      }
      
      // Update property rating
      await property.update({ rating: averageRating }, { transaction });
    }
    
    // Commit transaction
    await transaction.commit();
    
    return true;
  } catch (error) {
    // Rollback transaction on error
    await transaction.rollback();
    throw error;
  }
};