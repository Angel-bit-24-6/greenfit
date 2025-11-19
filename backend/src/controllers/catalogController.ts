import { Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { ApiResponse } from '../types/api';
import { CustomError } from '../middleware/errorHandler';
import { parseJsonArray, parseJsonObject } from '../utils/jsonHelpers';
import { updatePlateAvailability } from '../utils/plateAvailability';

export class CatalogController {
  /**
   * Get complete catalog (ingredients + plates)
   * GET /api/catalog
   */
  static async getCatalog(req: Request, res: Response, next: NextFunction) {
    try {
      // Update plate availability based on current ingredient stock
      await updatePlateAvailability();

      // Get all ingredients with their relations
      const ingredients = await prisma.ingredient.findMany({
        orderBy: [
          { available: 'desc' },
          { name: 'asc' }
        ]
      });

      // Get all plates with their ingredients
      const plates = await prisma.plate.findMany({
        include: {
          ingredients: {
            include: {
              ingredient: true
            }
          }
        },
        orderBy: [
          { available: 'desc' },
          { name: 'asc' }
        ]
      });

      // Transform plates data to match frontend expectations
      const transformedPlates = plates.map(plate => ({
        id: plate.id,
        name: plate.name,
        description: plate.description,
        ingredients: plate.ingredients.map(pi => pi.ingredientId),
        price: typeof plate.price === 'number' ? plate.price : Number(plate.price),
        tags: parseJsonArray(plate.tags),
        available: plate.available,
        image: plate.image,
        preparationTime: plate.preparationTime,
        nutritionalInfo: parseJsonObject(plate.nutritionalInfo),
        createdAt: plate.createdAt,
        updatedAt: plate.updatedAt
      }));

      // Transform ingredients data
      const transformedIngredients = ingredients.map(ingredient => ({
        id: ingredient.id,
        name: ingredient.name,
        synonyms: parseJsonArray(ingredient.synonyms),
        stock: ingredient.stock,
        price: typeof ingredient.price === 'number' ? ingredient.price : Number(ingredient.price),
        allergens: parseJsonArray(ingredient.allergens),
        tags: parseJsonArray(ingredient.tags),
        available: ingredient.available,
        description: ingredient.description,
        image: ingredient.image,
        nutritionalInfo: parseJsonObject(ingredient.nutritionalInfo)
      }));

      const catalog = {
        ingredients: transformedIngredients,
        plates: transformedPlates,
        lastUpdated: new Date().toISOString()
      };

      const response: ApiResponse = {
        ok: true,
        data: catalog,
        meta: {
          total: transformedIngredients.length + transformedPlates.length
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get ingredients only
   * GET /api/catalog/ingredients
   */
  static async getIngredients(req: Request, res: Response, next: NextFunction) {
    try {
      const { available, tags, search } = req.query;
      
      let whereClause: any = {};
      
      if (available === 'true') {
        whereClause.available = true;
        whereClause.stock = { gt: 0 };
      }

      if (search) {
        whereClause.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      const ingredients = await prisma.ingredient.findMany({
        where: whereClause,
        orderBy: [
          { available: 'desc' },
          { stock: 'desc' },
          { name: 'asc' }
        ]
      });

      const transformedIngredients = ingredients
        .map(ingredient => ({
          id: ingredient.id,
          name: ingredient.name,
          synonyms: parseJsonArray(ingredient.synonyms),
          stock: ingredient.stock,
          price: typeof ingredient.price === 'number' ? ingredient.price : Number(ingredient.price),
          allergens: parseJsonArray(ingredient.allergens),
          tags: parseJsonArray(ingredient.tags),
          available: ingredient.available,
          description: ingredient.description,
          image: ingredient.image,
          nutritionalInfo: parseJsonObject(ingredient.nutritionalInfo)
        }))
        .filter(ingredient => {
          if (tags) {
            const requestedTags = (tags as string).split(',');
            return requestedTags.some(tag => ingredient.tags.includes(tag));
          }
          return true;
        });

      const response: ApiResponse = {
        ok: true,
        data: transformedIngredients,
        meta: {
          total: transformedIngredients.length
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get plates only
   * GET /api/catalog/plates
   */
  static async getPlates(req: Request, res: Response, next: NextFunction) {
    try {
      const { available, tags, search } = req.query;
      
      let whereClause: any = {};
      
      if (available === 'true') {
        whereClause.available = true;
      }

      if (search) {
        whereClause.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      const plates = await prisma.plate.findMany({
        where: whereClause,
        include: {
          ingredients: {
            include: {
              ingredient: true
            }
          }
        },
        orderBy: [
          { available: 'desc' },
          { name: 'asc' }
        ]
      });

      const transformedPlates = plates
        .map(plate => ({
          id: plate.id,
          name: plate.name,
          description: plate.description,
          ingredients: plate.ingredients.map(pi => pi.ingredientId),
          price: typeof plate.price === 'number' ? plate.price : Number(plate.price),
          tags: parseJsonArray(plate.tags),
          available: plate.available,
          image: plate.image,
          preparationTime: plate.preparationTime,
          nutritionalInfo: parseJsonObject(plate.nutritionalInfo),
          createdAt: plate.createdAt,
          updatedAt: plate.updatedAt
        }))
        .filter(plate => {
          if (tags) {
            const requestedTags = (tags as string).split(',');
            return requestedTags.some(tag => plate.tags.includes(tag));
          }
          return true;
        });

      const response: ApiResponse = {
        ok: true,
        data: transformedPlates,
        meta: {
          total: transformedPlates.length
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get ingredient by ID
   * GET /api/catalog/ingredients/:id
   */
  static async getIngredientById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!id) {
        throw new CustomError('ID parameter is required', 400);
      }

      const ingredient = await prisma.ingredient.findUnique({
        where: { id }
      });

      if (!ingredient) {
        throw new CustomError('Ingredient not found', 404);
      }

      const transformedIngredient = {
        id: ingredient.id,
        name: ingredient.name,
        synonyms: parseJsonArray(ingredient.synonyms),
        stock: ingredient.stock,
        price: typeof ingredient.price === 'number' ? ingredient.price : Number(ingredient.price),
        allergens: parseJsonArray(ingredient.allergens),
        tags: parseJsonArray(ingredient.tags),
        available: ingredient.available,
        description: ingredient.description,
        image: ingredient.image,
        nutritionalInfo: parseJsonObject(ingredient.nutritionalInfo)
      };

      const response: ApiResponse = {
        ok: true,
        data: transformedIngredient
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get plate by ID
   * GET /api/catalog/plates/:id
   */
  static async getPlateById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!id) {
        throw new CustomError('ID parameter is required', 400);
      }

      const plate = await prisma.plate.findUnique({
        where: { id },
        include: {
          ingredients: {
            include: {
              ingredient: true
            }
          }
        }
      });

      if (!plate) {
        throw new CustomError('Plate not found', 404);
      }

      const transformedPlate = {
        id: plate.id,
        name: plate.name,
        description: plate.description,
        ingredients: plate.ingredients.map(pi => ({
          id: pi.ingredient.id,
          name: pi.ingredient.name,
          quantity: pi.quantity,
          required: pi.required
        })),
        price: typeof plate.price === 'number' ? plate.price : Number(plate.price),
        tags: parseJsonArray(plate.tags),
        available: plate.available,
        image: plate.image,
        preparationTime: plate.preparationTime,
        nutritionalInfo: parseJsonObject(plate.nutritionalInfo)
      };

      const response: ApiResponse = {
        ok: true,
        data: transformedPlate
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get plate ingredients with full details
   * GET /api/catalog/plates/:plateId/ingredients
   */
  static async getPlateIngredients(req: Request, res: Response, next: NextFunction) {
    try {
      const { plateId } = req.params;

      if (!plateId) {
        throw new CustomError('Plate ID parameter is required', 400);
      }

      const plateWithIngredients = await prisma.plate.findUnique({
        where: { id: plateId },
        include: {
          ingredients: {
            include: {
              ingredient: true
            }
          }
        }
      });

      if (!plateWithIngredients) {
        throw new CustomError('Plate not found', 404);
      }

      const ingredients = plateWithIngredients.ingredients.map(pi => ({
        id: pi.ingredient.id,
        name: pi.ingredient.name,
        price: typeof pi.ingredient.price === 'number' ? pi.ingredient.price : Number(pi.ingredient.price),
        quantity: pi.quantity,
        required: pi.required,
        isCustom: false, // Base ingredients are not custom
        stock: pi.ingredient.stock,
        available: pi.ingredient.available,
        allergens: parseJsonArray(pi.ingredient.allergens),
        tags: parseJsonArray(pi.ingredient.tags),
        description: pi.ingredient.description,
        nutritionalInfo: parseJsonObject(pi.ingredient.nutritionalInfo)
      }));

      const response: ApiResponse = {
        ok: true,
        data: {
          plateId: plateId,
          plateName: plateWithIngredients.name,
          ingredients: ingredients
        },
        meta: {
          total: ingredients.length
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}