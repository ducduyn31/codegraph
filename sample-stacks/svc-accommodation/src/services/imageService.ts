import { v4 as uuidv4 } from 'uuid';
import Image from '../models/Image';
import Property from '../models/Property';
import Room from '../models/Room';
import { ImageAttributes } from '../types/accommodation';
import { Transaction } from 'sequelize';
import sequelize from '../models/index';

/**
 * Add image to a property or room
 */
export const addImage = async (
  referenceId: string,
  referenceType: 'property' | 'room',
  url: string,
  caption: string = '',
  isPrimary: boolean = false
) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Check if reference exists
    if (referenceType === 'property') {
      const property = await Property.findByPk(referenceId, { transaction });
      
      if (!property) {
        throw new Error('Property not found');
      }
    } else if (referenceType === 'room') {
      const room = await Room.findByPk(referenceId, { transaction });
      
      if (!room) {
        throw new Error('Room not found');
      }
    }
    
    // If this is a primary image, update any existing primary images
    if (isPrimary) {
      const existingPrimaryImages = await Image.findAll({
        where: {
          referenceId,
          referenceType,
          isPrimary: true,
        },
        transaction,
      });
      
      for (const image of existingPrimaryImages) {
        await image.update({ isPrimary: false }, { transaction });
      }
    }
    
    // Create image
    const image = await Image.create(
      {
        id: uuidv4(),
        referenceId,
        referenceType,
        url,
        caption,
        isPrimary,
      },
      { transaction }
    );
    
    // Commit transaction
    await transaction.commit();
    
    return image;
  } catch (error) {
    // Rollback transaction on error
    await transaction.rollback();
    throw error;
  }
};

/**
 * Get images for a property or room
 */
export const getImages = async (referenceId: string, referenceType: 'property' | 'room') => {
  return Image.findAll({
    where: {
      referenceId,
      referenceType,
    },
    order: [
      ['isPrimary', 'DESC'],
      ['createdAt', 'ASC'],
    ],
  });
};

/**
 * Get image by ID
 */
export const getImageById = async (id: string) => {
  return Image.findByPk(id);
};

/**
 * Update image
 */
export const updateImage = async (
  id: string,
  imageData: Partial<Omit<ImageAttributes, 'id' | 'referenceId' | 'referenceType' | 'createdAt' | 'updatedAt'>>
) => {
  const transaction = await sequelize.transaction();
  
  try {
    const image = await Image.findByPk(id, { transaction });
    
    if (!image) {
      throw new Error('Image not found');
    }
    
    // If setting this image as primary, update any existing primary images
    if (imageData.isPrimary) {
      const existingPrimaryImages = await Image.findAll({
        where: {
          referenceId: image.referenceId,
          referenceType: image.referenceType,
          isPrimary: true,
          id: { $ne: id },
        },
        transaction,
      });
      
      for (const primaryImage of existingPrimaryImages) {
        await primaryImage.update({ isPrimary: false }, { transaction });
      }
    }
    
    // Update image
    await image.update(imageData, { transaction });
    
    // Commit transaction
    await transaction.commit();
    
    return image;
  } catch (error) {
    // Rollback transaction on error
    await transaction.rollback();
    throw error;
  }
};

/**
 * Delete image
 */
export const deleteImage = async (id: string) => {
  const transaction = await sequelize.transaction();
  
  try {
    const image = await Image.findByPk(id, { transaction });
    
    if (!image) {
      throw new Error('Image not found');
    }
    
    // Delete image
    await image.destroy({ transaction });
    
    // Commit transaction
    await transaction.commit();
    
    return true;
  } catch (error) {
    // Rollback transaction on error
    await transaction.rollback();
    throw error;
  }
};