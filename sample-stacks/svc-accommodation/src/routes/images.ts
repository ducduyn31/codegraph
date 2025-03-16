import { Router, Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import * as imageService from '../services/imageService';

const router = Router();

// Type definitions for request parameters
interface ImageParams extends ParamsDictionary {
  id: string;
}

interface UpdateImageBody {
  url?: string;
  caption?: string;
  isPrimary?: boolean;
}

// Get image by ID
router.get('/:id', async (req: Request<ImageParams>, res: Response) => {
  try {
    const image = await imageService.getImageById(req.params.id);
    
    if (!image) {
      res.status(404).json({ error: 'Image not found' });
      return;
    }
    
    res.json(image);
  } catch (error) {
    console.error('Error fetching image:', error);
    res.status(500).json({ error: 'Failed to fetch image' });
  }
});

// Update image
router.put('/:id', async (req: Request<ImageParams, {}, UpdateImageBody>, res: Response) => {
  try {
    const imageData = req.body;
    
    // Validate URL if provided
    if (imageData.url !== undefined && !imageData.url) {
      res.status(400).json({ error: 'URL cannot be empty' });
      return;
    }
    
    const image = await imageService.updateImage(req.params.id, imageData);
    res.json(image);
  } catch (error) {
    console.error('Error updating image:', error);
    
    if ((error as Error).message === 'Image not found') {
      res.status(404).json({ error: 'Image not found' });
    } else {
      res.status(500).json({ error: 'Failed to update image' });
    }
  }
});

// Delete image
router.delete('/:id', async (req: Request<ImageParams>, res: Response) => {
  try {
    const result = await imageService.deleteImage(req.params.id);
    
    if (result) {
      res.status(204).end();
    } else {
      res.status(404).json({ error: 'Image not found' });
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    
    if ((error as Error).message === 'Image not found') {
      res.status(404).json({ error: 'Image not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete image' });
    }
  }
});

export default router;