import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { CustomError } from '../middleware/errorHandler';
import { ApiResponse, PaginationParams } from '../types/api';
import { updatePlateAvailability } from '../utils/plateAvailability';
import { parseJsonArray, parseJsonObject } from '../utils/jsonHelpers';

// Validation schemas
const createIngredientSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  synonyms: z.array(z.string()).optional().default([]),
  stock: z.number().int().min(0, 'Stock cannot be negative'),
  price: z.number().min(0, 'Price cannot be negative'),
  allergens: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  available: z.boolean().optional().default(true),
  description: z.string().optional(),
  nutritionalInfo: z.object({
    calories: z.number().optional(),
    protein: z.number().optional(),
    carbs: z.number().optional(),
    fat: z.number().optional(),
    fiber: z.number().optional(),
  }).optional()
});

const updateIngredientSchema = createIngredientSchema.partial();

const createPlateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().min(1, 'Description is required').max(500, 'Description too long'),
  price: z.number().min(0, 'Price cannot be negative'),
  tags: z.array(z.string()).optional().default([]),
  available: z.boolean().optional().default(true),
  preparationTime: z.number().int().min(1).max(120).optional(),
  ingredients: z.array(z.object({
    ingredientId: z.string(),
    quantity: z.number().int().min(1),
    required: z.boolean().optional().default(true)
  })).min(1, 'At least one ingredient is required'),
  nutritionalInfo: z.object({
    calories: z.number().optional(),
    protein: z.number().optional(),
    carbs: z.number().optional(),
    fat: z.number().optional(),
    fiber: z.number().optional(),
  }).optional()
});

const updatePlateSchema = createPlateSchema.partial().extend({
  ingredients: z.array(z.object({
    ingredientId: z.string(),
    quantity: z.number().int().min(1),
    required: z.boolean().optional().default(true)
  })).optional()
});

export class AdminController {

  // ===== INVENTORY MANAGEMENT =====

  /**
   * Get all ingredients with pagination and filters
   * GET /api/admin/ingredients
   */
  static async getIngredients(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, search, available, tag } = req.query;
      
      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
      const offset = (pageNum - 1) * limitNum;

      // Build where clause - Always exclude soft-deleted items
      const whereClause: any = {
        isDeleted: false // Only show non-deleted ingredients
      };
      
      if (search && typeof search === 'string') {
        whereClause.OR = [
          { name: { contains: search } },
          { description: { contains: search } }
        ];
      }

      if (available !== undefined) {
        whereClause.available = available === 'true';
      }

      if (tag && typeof tag === 'string') {
        whereClause.tags = { contains: tag };
      }

      // Get ingredients with count
      const [ingredients, totalCount] = await Promise.all([
        prisma.ingredient.findMany({
          where: whereClause,
          orderBy: { name: 'asc' },
          skip: offset,
          take: limitNum,
          select: {
            id: true,
            name: true,
            synonyms: true,
            stock: true,
            price: true,
            allergens: true,
            tags: true,
            available: true,
            description: true,
            nutritionalInfo: true,
            createdAt: true,
            updatedAt: true
          }
        }),
        prisma.ingredient.count({ where: whereClause })
      ]);

      // Parse JSON fields and convert Decimal to number
      const parsedIngredients = ingredients.map(ing => ({
        ...ing,
        price: typeof ing.price === 'number' ? ing.price : Number(ing.price),
        synonyms: Array.isArray(ing.synonyms) ? ing.synonyms : JSON.parse(ing.synonyms as string || '[]'),
        allergens: Array.isArray(ing.allergens) ? ing.allergens : JSON.parse(ing.allergens as string || '[]'),
        tags: Array.isArray(ing.tags) ? ing.tags : JSON.parse(ing.tags as string || '[]'),
        nutritionalInfo: typeof ing.nutritionalInfo === 'object' && ing.nutritionalInfo !== null 
          ? ing.nutritionalInfo 
          : JSON.parse(ing.nutritionalInfo as string || '{}')
      }));

      const response: ApiResponse = {
        ok: true,
        data: parsedIngredients,
        meta: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          hasNext: offset + limitNum < totalCount,
          hasPrev: pageNum > 1,
          filters: { search, available, tag }
        }
      };

      console.log(`📦 Admin fetched ${ingredients.length}/${totalCount} ingredients`);
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new ingredient
   * POST /api/admin/ingredients
   */
  static async createIngredient(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = createIngredientSchema.parse(req.body);

      // Check if ingredient name already exists
      const existingIngredient = await prisma.ingredient.findFirst({
        where: { name: { equals: validatedData.name } }
      });

      if (existingIngredient) {
        throw new CustomError(`Ingredient "${validatedData.name}" already exists`, 400);
      }

      const ingredient = await prisma.ingredient.create({
        data: {
          name: validatedData.name,
          synonyms: JSON.stringify(validatedData.synonyms || []),
          stock: validatedData.stock,
          price: validatedData.price,
          allergens: JSON.stringify(validatedData.allergens || []),
          tags: JSON.stringify(validatedData.tags || []),
          available: validatedData.available ?? true,
          description: validatedData.description || null,
          nutritionalInfo: JSON.stringify(validatedData.nutritionalInfo || {})
        }
      });

      // Update plate availability based on new stock
      await updatePlateAvailability();

      const response: ApiResponse = {
        ok: true,
        data: {
          ...ingredient,
          synonyms: parseJsonArray(ingredient.synonyms),
          allergens: parseJsonArray(ingredient.allergens),
          tags: parseJsonArray(ingredient.tags),
          nutritionalInfo: parseJsonObject(ingredient.nutritionalInfo)
        }
      };

      console.log(`✅ Admin created ingredient: ${ingredient.name}`);
      res.status(201).json(response);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const response: ApiResponse = {
          ok: false,
          error: 'Validation failed',
          warnings: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        };
        res.status(400).json(response);
        return;
      }
      next(error);
    }
  }

  /**
   * Update ingredient
   * PUT /api/admin/ingredients/:id
   */
  static async updateIngredient(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validatedData = updateIngredientSchema.parse(req.body);

      if (!id) {
        throw new CustomError('Ingredient ID is required', 400);
      }

      // Check if ingredient exists
      const existingIngredient = await prisma.ingredient.findUnique({
        where: { id }
      });

      if (!existingIngredient) {
        throw new CustomError('Ingredient not found', 404);
      }

      // Check name uniqueness if name is being updated
      if (validatedData.name) {
        const nameConflict = await prisma.ingredient.findFirst({
          where: { 
            name: { equals: validatedData.name },
            NOT: { id: id }
          }
        });

        if (nameConflict) {
          throw new CustomError(`Ingredient name "${validatedData.name}" already exists`, 400);
        }
      }

      // Build update data
      const updateData: any = {};
      
      if (validatedData.name !== undefined) updateData.name = validatedData.name;
      if (validatedData.synonyms !== undefined) updateData.synonyms = JSON.stringify(validatedData.synonyms);
      if (validatedData.stock !== undefined) updateData.stock = validatedData.stock;
      if (validatedData.price !== undefined) updateData.price = validatedData.price;
      if (validatedData.allergens !== undefined) updateData.allergens = JSON.stringify(validatedData.allergens);
      if (validatedData.tags !== undefined) updateData.tags = JSON.stringify(validatedData.tags);
      if (validatedData.available !== undefined) updateData.available = validatedData.available;
      if (validatedData.description !== undefined) updateData.description = validatedData.description || null;
      if (validatedData.nutritionalInfo !== undefined) updateData.nutritionalInfo = JSON.stringify(validatedData.nutritionalInfo);

      const updatedIngredient = await prisma.ingredient.update({
        where: { id },
        data: updateData
      });

      // Update plate availability if stock or availability changed
      if (validatedData.stock !== undefined || validatedData.available !== undefined) {
        await updatePlateAvailability();
      }

      const response: ApiResponse = {
        ok: true,
        data: {
          ...updatedIngredient,
          synonyms: parseJsonArray(updatedIngredient.synonyms),
          allergens: parseJsonArray(updatedIngredient.allergens),
          tags: parseJsonArray(updatedIngredient.tags),
          nutritionalInfo: parseJsonObject(updatedIngredient.nutritionalInfo)
        }
      };

      console.log(`✅ Admin updated ingredient: ${updatedIngredient.name}`);
      res.json(response);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const response: ApiResponse = {
          ok: false,
          error: 'Validation failed',
          warnings: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        };
        res.status(400).json(response);
        return;
      }
      next(error);
    }
  }

  /**
   * Soft delete ingredient (maintains referential integrity)
   * DELETE /api/admin/ingredients/:id
   */
  static async deleteIngredient(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!id) {
        throw new CustomError('Ingredient ID is required', 400);
      }

      // Get admin user ID for audit trail
      const adminUserId = req.user?.id;
      if (!adminUserId) {
        throw new CustomError('Admin user not found', 401);
      }

      // Check if ingredient exists and is not already deleted
      const ingredient = await prisma.ingredient.findUnique({
        where: { 
          id,
          isDeleted: false // Only find non-deleted ingredients
        },
        include: {
          plateIngredients: {
            include: { 
              plate: true
            }
          }
        }
      });

      if (!ingredient) {
        throw new CustomError('Ingredient not found or already deleted', 404);
      }

      // Check if ingredient is used in active plates
      const activePlateUsage = ingredient.plateIngredients?.filter((pi: any) => 
        pi.plate && !pi.plate.isDeleted
      ) || [];

      if (activePlateUsage.length > 0) {
        const plateNames = activePlateUsage.map((pi: any) => pi.plate.name);
        throw new CustomError(
          `Cannot delete ingredient. It's currently used in active plates: ${plateNames.join(', ')}. Please remove it from those plates first or disable the ingredient instead.`, 
          400
        );
      }

      // Perform soft delete
      const deletedIngredient = await prisma.ingredient.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: adminUserId,
          available: false, // Also mark as unavailable
        }
      });

      const response: ApiResponse = {
        ok: true,
        data: { 
          message: 'Ingredient deleted successfully (soft delete)',
          deletedAt: deletedIngredient.deletedAt,
          note: 'This ingredient is now hidden but historical data is preserved'
        }
      };

      console.log(`🗑️ Admin soft-deleted ingredient: ${ingredient.name} (ID: ${id})`);
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get deleted ingredients for audit purposes
   * GET /api/admin/ingredients/deleted
   */
  static async getDeletedIngredients(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, search } = req.query;
      
      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
      const offset = (pageNum - 1) * limitNum;

      // Build where clause - Only show soft-deleted items
      const whereClause: any = {
        isDeleted: true // Only show deleted ingredients
      };
      
      if (search && typeof search === 'string') {
        whereClause.OR = [
          { name: { contains: search } },
          { description: { contains: search } }
        ];
      }

      // Get deleted ingredients with count
      const [ingredients, totalCount] = await Promise.all([
        prisma.ingredient.findMany({
          where: whereClause,
          orderBy: { deletedAt: 'desc' },
          skip: offset,
          take: limitNum,
          select: {
            id: true,
            name: true,
            synonyms: true,
            stock: true,
            price: true,
            allergens: true,
            tags: true,
            available: true,
            description: true,
            nutritionalInfo: true,
            isDeleted: true,
            deletedAt: true,
            deletedBy: true,
            createdAt: true,
            updatedAt: true
          }
        }),
        prisma.ingredient.count({ where: whereClause })
      ]);

      // Parse JSON fields and convert Decimal to number
      const parsedIngredients = ingredients.map(ing => ({
        ...ing,
        price: typeof ing.price === 'number' ? ing.price : Number(ing.price),
        synonyms: Array.isArray(ing.synonyms) ? ing.synonyms : JSON.parse(ing.synonyms as string || '[]'),
        allergens: Array.isArray(ing.allergens) ? ing.allergens : JSON.parse(ing.allergens as string || '[]'),
        tags: Array.isArray(ing.tags) ? ing.tags : JSON.parse(ing.tags as string || '[]'),
        nutritionalInfo: typeof ing.nutritionalInfo === 'object' && ing.nutritionalInfo !== null 
          ? ing.nutritionalInfo 
          : JSON.parse(ing.nutritionalInfo as string || '{}')
      }));

      const response: ApiResponse = {
        ok: true,
        data: parsedIngredients,
        meta: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          hasNext: offset + limitNum < totalCount,
          hasPrev: pageNum > 1,
          filters: { search },
          note: 'These are soft-deleted ingredients for audit purposes'
        }
      };

      console.log(`📋 Admin fetched ${ingredients.length}/${totalCount} deleted ingredients`);
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Restore soft-deleted ingredient
   * POST /api/admin/ingredients/:id/restore
   */
  static async restoreIngredient(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!id) {
        throw new CustomError('Ingredient ID is required', 400);
      }

      // Check if ingredient exists and is deleted
      const ingredient = await prisma.ingredient.findUnique({
        where: { 
          id,
          isDeleted: true
        }
      });

      if (!ingredient) {
        throw new CustomError('Deleted ingredient not found', 404);
      }

      // Restore ingredient
      const restoredIngredient = await prisma.ingredient.update({
        where: { id },
        data: {
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
          available: true, // Make available again
        }
      });

      const response: ApiResponse = {
        ok: true,
        data: {
          ...restoredIngredient,
          synonyms: parseJsonArray(restoredIngredient.synonyms),
          allergens: parseJsonArray(restoredIngredient.allergens),
          tags: parseJsonArray(restoredIngredient.tags),
          nutritionalInfo: parseJsonObject(restoredIngredient.nutritionalInfo)
        }
      };

      console.log(`♻️ Admin restored ingredient: ${ingredient.name} (ID: ${id})`);
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk update ingredient stock
   * POST /api/admin/ingredients/bulk-stock
   */
  static async bulkUpdateStock(req: Request, res: Response, next: NextFunction) {
    try {
      const { updates } = req.body;
      
      if (!Array.isArray(updates)) {
        throw new CustomError('Updates must be an array', 400);
      }

      const validatedUpdates = updates.map((update, index) => {
        const result = z.object({
          id: z.string(),
          stock: z.number().int().min(0)
        }).safeParse(update);

        if (!result.success) {
          throw new CustomError(`Invalid update at index ${index}: ${result.error.message}`, 400);
        }

        return result.data;
      });

      // Perform bulk updates
      const updatePromises = validatedUpdates.map(update =>
        prisma.ingredient.update({
          where: { id: update.id },
          data: { stock: update.stock }
        }).catch(error => ({
          id: update.id,
          error: 'Ingredient not found'
        }))
      );

      const results = await Promise.all(updatePromises);
      
      // Separate successful updates from errors
      const successful = results.filter(r => !('error' in r));
      const failed = results.filter(r => 'error' in r);

      // Update plate availability
      await updatePlateAvailability();

      const response: ApiResponse = {
        ok: true,
        data: {
          successful: successful.length,
          failed: failed.length,
          failures: failed
        }
      };

      console.log(`📦 Admin bulk updated stock: ${successful.length} successful, ${failed.length} failed`);
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // ===== MENU MANAGEMENT =====

  /**
   * Get all plates with ingredients
   * GET /api/admin/plates
   */
  static async getPlates(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, search, available } = req.query;
      
      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
      const offset = (pageNum - 1) * limitNum;

      // Build where clause - Always exclude soft-deleted items
      const whereClause: any = {
        isDeleted: false // Only show non-deleted plates
      };
      
      if (search && typeof search === 'string') {
        whereClause.OR = [
          { name: { contains: search } },
          { description: { contains: search } }
        ];
      }

      if (available !== undefined) {
        whereClause.available = available === 'true';
      }

      // Get plates with count
      const [plates, totalCount] = await Promise.all([
        prisma.plate.findMany({
          where: whereClause,
          include: {
            ingredients: {
              include: {
                ingredient: {
                  select: {
                    id: true,
                    name: true,
                    available: true,
                    stock: true,
                    price: true
                  }
                }
              }
            }
          },
          orderBy: { name: 'asc' },
          skip: offset,
          take: limitNum
        }),
        prisma.plate.count({ where: whereClause })
      ]);

      // Format response with parsed JSON and ingredient details
      const formattedPlates = plates.map(plate => ({
        ...plate,
        price: typeof plate.price === 'number' ? plate.price : Number(plate.price),
        tags: parseJsonArray(plate.tags),
        nutritionalInfo: parseJsonObject(plate.nutritionalInfo),
        ingredients: plate.ingredients.map(pi => ({
          id: pi.id,
          ingredientId: pi.ingredientId,
          quantity: pi.quantity,
          required: pi.required,
          ingredient: pi.ingredient
        }))
      }));

      const response: ApiResponse = {
        ok: true,
        data: formattedPlates,
        meta: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          hasNext: offset + limitNum < totalCount,
          hasPrev: pageNum > 1,
          filters: { search, available }
        }
      };

      console.log(`🍽️ Admin fetched ${plates.length}/${totalCount} plates`);
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new plate
   * POST /api/admin/plates
   */
  static async createPlate(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = createPlateSchema.parse(req.body);

      // Check if plate name already exists
      const existingPlate = await prisma.plate.findFirst({
        where: { name: { equals: validatedData.name } }
      });

      if (existingPlate) {
        throw new CustomError(`Plate "${validatedData.name}" already exists`, 400);
      }

      // Verify all ingredients exist
      const ingredientIds = validatedData.ingredients.map(ing => ing.ingredientId);
      const existingIngredients = await prisma.ingredient.findMany({
        where: { id: { in: ingredientIds } },
        select: { id: true }
      });

      const existingIds = existingIngredients.map(ing => ing.id);
      const missingIds = ingredientIds.filter(id => !existingIds.includes(id));

      if (missingIds.length > 0) {
        throw new CustomError(`Ingredients not found: ${missingIds.join(', ')}`, 400);
      }

      // Create plate and ingredients in transaction
      const result = await prisma.$transaction(async (tx) => {
        const plate = await tx.plate.create({
          data: {
            name: validatedData.name,
            description: validatedData.description,
            price: validatedData.price,
            tags: JSON.stringify(validatedData.tags || []),
            available: validatedData.available ?? true,
            preparationTime: validatedData.preparationTime || null,
            nutritionalInfo: JSON.stringify(validatedData.nutritionalInfo || {})
          }
        });

        // Create plate ingredients
        const plateIngredients = await Promise.all(
          validatedData.ingredients.map(ing =>
            tx.plateIngredient.create({
              data: {
                plateId: plate.id,
                ingredientId: ing.ingredientId,
                quantity: ing.quantity,
                required: ing.required
              }
            })
          )
        );

        return { plate, plateIngredients };
      });

      // Update plate availability
      await updatePlateAvailability();

      const response: ApiResponse = {
        ok: true,
        data: {
          ...result.plate,
          tags: parseJsonArray(result.plate.tags),
          nutritionalInfo: parseJsonObject(result.plate.nutritionalInfo),
          ingredients: result.plateIngredients
        }
      };

      console.log(`✅ Admin created plate: ${result.plate.name}`);
      res.status(201).json(response);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const response: ApiResponse = {
          ok: false,
          error: 'Validation failed',
          warnings: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        };
        res.status(400).json(response);
        return;
      }
      next(error);
    }
  }

  /**
   * Update plate
   * PUT /api/admin/plates/:id
   */
  static async updatePlate(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validatedData = updatePlateSchema.parse(req.body);

      if (!id) {
        throw new CustomError('Plate ID is required', 400);
      }

      // Check if plate exists
      const existingPlate = await prisma.plate.findUnique({
        where: { id },
        include: { ingredients: true }
      });

      if (!existingPlate) {
        throw new CustomError('Plate not found', 404);
      }

      // Check name uniqueness if name is being updated
      if (validatedData.name) {
        const nameConflict = await prisma.plate.findFirst({
          where: { 
            name: { equals: validatedData.name },
            NOT: { id: id }
          }
        });

        if (nameConflict) {
          throw new CustomError(`Plate name "${validatedData.name}" already exists`, 400);
        }
      }

      // Verify ingredients if updating
      if (validatedData.ingredients) {
        const ingredientIds = validatedData.ingredients.map(ing => ing.ingredientId);
        const existingIngredients = await prisma.ingredient.findMany({
          where: { id: { in: ingredientIds } },
          select: { id: true }
        });

        const existingIds = existingIngredients.map(ing => ing.id);
        const missingIds = ingredientIds.filter(id => !existingIds.includes(id));

        if (missingIds.length > 0) {
          throw new CustomError(`Ingredients not found: ${missingIds.join(', ')}`, 400);
        }
      }

      // Update plate in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Build update data for plate
        const updateData: any = {};
        if (validatedData.name !== undefined) updateData.name = validatedData.name;
        if (validatedData.description !== undefined) updateData.description = validatedData.description;
        if (validatedData.price !== undefined) updateData.price = validatedData.price;
        if (validatedData.tags !== undefined) updateData.tags = JSON.stringify(validatedData.tags);
        if (validatedData.available !== undefined) updateData.available = validatedData.available;
        if (validatedData.preparationTime !== undefined) updateData.preparationTime = validatedData.preparationTime;
        if (validatedData.nutritionalInfo !== undefined) updateData.nutritionalInfo = JSON.stringify(validatedData.nutritionalInfo);

        const plate = await tx.plate.update({
          where: { id },
          data: updateData
        });

        // Update ingredients if provided
        let plateIngredients = existingPlate.ingredients || [];
        
        if (validatedData.ingredients && id) {
          // Remove existing ingredients
          await tx.plateIngredient.deleteMany({
            where: { plateId: id }
          });

          // Create new ingredients
          plateIngredients = await Promise.all(
            validatedData.ingredients.map(ing =>
              tx.plateIngredient.create({
                data: {
                  plateId: id,
                  ingredientId: ing.ingredientId,
                  quantity: ing.quantity,
                  required: ing.required ?? true
                }
              })
            )
          );
        }

        return { plate, plateIngredients };
      });

      // Update plate availability
      await updatePlateAvailability();

      const response: ApiResponse = {
        ok: true,
        data: {
          ...result.plate,
          tags: parseJsonArray(result.plate.tags),
          nutritionalInfo: parseJsonObject(result.plate.nutritionalInfo),
          ingredients: result.plateIngredients
        }
      };

      console.log(`✅ Admin updated plate: ${result.plate.name}`);
      res.json(response);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const response: ApiResponse = {
          ok: false,
          error: 'Validation failed',
          warnings: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        };
        res.status(400).json(response);
        return;
      }
      next(error);
    }
  }

  /**
   * Soft delete plate (maintains order history)
   * DELETE /api/admin/plates/:id
   */
  static async deletePlate(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!id) {
        throw new CustomError('Plate ID is required', 400);
      }

      // Get admin user ID for audit trail
      const adminUserId = req.user?.id;
      if (!adminUserId) {
        throw new CustomError('Admin user not found', 401);
      }

      // Check if plate exists and is not already deleted
      const plate = await prisma.plate.findUnique({
        where: { 
          id,
          isDeleted: false
        }
      });

      if (!plate) {
        throw new CustomError('Plate not found or already deleted', 404);
      }

      // Check if plate is in any active orders (current active orders)
      const activeOrdersWithPlate = await prisma.order.findFirst({
        where: {
          items: { path: [], string_contains: id },
          status: { in: ['confirmed', 'preparing', 'ready'] },
          paymentStatus: 'completed'
        }
      });

      if (activeOrdersWithPlate) {
        throw new CustomError(
          'Cannot delete plate with active orders. Please wait until all current orders are completed, or disable the plate instead.',
          400
        );
      }

      // Check if plate is currently in anyone's cart
      const cartItemsWithPlate = await prisma.cartItem.findFirst({
        where: {
          plateId: id
        }
      });

      if (cartItemsWithPlate) {
        throw new CustomError(
          'Cannot delete plate that is currently in customer carts. Please disable the plate instead.',
          400
        );
      }

      // Perform soft delete
      const deletedPlate = await prisma.plate.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: adminUserId,
          available: false, // Also mark as unavailable
        }
      });

      const response: ApiResponse = {
        ok: true,
        data: { 
          message: 'Plate deleted successfully (soft delete)',
          deletedAt: deletedPlate.deletedAt,
          note: 'This plate is now hidden but order history is preserved. Customers can still see it in their past orders.'
        }
      };

      console.log(`🗑️ Admin soft-deleted plate: ${plate.name} (ID: ${id})`);
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // ===== ANALYTICS & REPORTING =====

  /**
   * Get sales analytics
   * GET /api/admin/analytics/sales
   */
  static async getSalesAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { period = '7d', startDate, endDate } = req.query;

      let dateFilter: any = {};
      const now = new Date();

      if (startDate && endDate) {
        dateFilter = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        };
      } else {
        switch (period) {
          case '24h':
            dateFilter.gte = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case '7d':
            dateFilter.gte = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30d':
            dateFilter.gte = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case '90d':
            dateFilter.gte = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          default:
            dateFilter.gte = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        }
      }

      // Get orders within date range
      const orders = await prisma.order.findMany({
        where: {
          paymentStatus: 'completed',
          createdAt: dateFilter
        },
        select: {
          id: true,
          totalPrice: true,
          items: true,
          status: true,
          createdAt: true,
          preparationTime: true
        },
        orderBy: { createdAt: 'asc' }
      });

      // Calculate metrics
      const totalRevenue = orders.reduce((sum, order) => sum + Number(order.totalPrice), 0);
      const totalOrders = orders.length;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      
      // Calculate completion stats
      const completedOrders = orders.filter(o => o.status === 'delivered');
      const completionRate = totalOrders > 0 ? (completedOrders.length / totalOrders) * 100 : 0;
      
      // Calculate average preparation time
      const ordersWithPrepTime = orders.filter(o => o.preparationTime !== null);
      const avgPrepTime = ordersWithPrepTime.length > 0 
        ? ordersWithPrepTime.reduce((sum, o) => sum + (o.preparationTime || 0), 0) / ordersWithPrepTime.length 
        : 0;

      // Popular ingredients analysis
      const ingredientCounts: Record<string, { count: number; revenue: number }> = {};
      const plateCounts: Record<string, { count: number; revenue: number }> = {};

      for (const order of orders) {
        const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
        
        for (const item of items) {
          // Count plates
          if (item.type === 'plate' && item.plateId) {
            const key = item.plateId;
            if (!plateCounts[key]) {
              plateCounts[key] = { count: 0, revenue: 0 };
            }
            plateCounts[key].count += item.quantity;
            plateCounts[key].revenue += item.price * item.quantity;
          }

          // Count ingredients (from custom plates and plate ingredients)
          if (item.customIngredients) {
            for (const ingredientId of item.customIngredients) {
              if (!ingredientCounts[ingredientId]) {
                ingredientCounts[ingredientId] = { count: 0, revenue: 0 };
              }
              ingredientCounts[ingredientId].count += item.quantity;
              ingredientCounts[ingredientId].revenue += (item.price / item.customIngredients.length) * item.quantity;
            }
          }
        }
      }

      // Get top ingredients with names
      const topIngredientIds = Object.entries(ingredientCounts)
        .sort(([,a], [,b]) => b.count - a.count)
        .slice(0, 10)
        .map(([id]) => id);

      const topIngredients = await prisma.ingredient.findMany({
        where: { id: { in: topIngredientIds } },
        select: { id: true, name: true }
      });

      // Get top plates with names
      const topPlateIds = Object.entries(plateCounts)
        .sort(([,a], [,b]) => b.count - a.count)
        .slice(0, 10)
        .map(([id]) => id);

      const topPlates = await prisma.plate.findMany({
        where: { id: { in: topPlateIds } },
        select: { id: true, name: true }
      });

      // Daily revenue for charting
      const dailyRevenue: Record<string, number> = {};
      for (const order of orders) {
        const dateKey = order.createdAt.toISOString().split('T')[0];
        if (dateKey && !dailyRevenue[dateKey]) {
          dailyRevenue[dateKey] = 0;
        }
        if (dateKey) {
          dailyRevenue[dateKey] += Number(order.totalPrice);
        }
      }

      const response: ApiResponse = {
        ok: true,
        data: {
          summary: {
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            totalOrders,
            avgOrderValue: Math.round(avgOrderValue * 100) / 100,
            completionRate: Math.round(completionRate * 100) / 100,
            avgPrepTime: Math.round(avgPrepTime)
          },
          topIngredients: topIngredients.map(ing => ({
            ...ing,
            ...ingredientCounts[ing.id],
            revenue: Math.round((ingredientCounts[ing.id]?.revenue || 0) * 100) / 100
          })),
          topPlates: topPlates.map(plate => ({
            ...plate,
            ...plateCounts[plate.id],
            revenue: Math.round((plateCounts[plate.id]?.revenue || 0) * 100) / 100
          })),
          dailyRevenue: Object.entries(dailyRevenue).map(([date, revenue]) => ({
            date: date || '',
            revenue: Math.round((revenue || 0) * 100) / 100
          })),
          period,
          dateRange: {
            start: dateFilter.gte?.toISOString(),
            end: dateFilter.lte?.toISOString() || now.toISOString()
          }
        }
      };

      console.log(`📊 Admin analytics: ${totalOrders} orders, $${totalRevenue.toFixed(2)} revenue`);
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get inventory analytics
   * GET /api/admin/analytics/inventory
   */
  static async getInventoryAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      // Get all active (non-deleted) ingredients with stock info
      const ingredients = await prisma.ingredient.findMany({
        where: { isDeleted: false }, // Only include active ingredients
        select: {
          id: true,
          name: true,
          stock: true,
          available: true,
          plateIngredients: {
            include: {
              plate: {
                select: { name: true, available: true, isDeleted: true }
              }
            }
          }
        },
        orderBy: { stock: 'asc' }
      });

      // Categorize inventory
      const lowStock = ingredients.filter(ing => ing.stock <= 5 && ing.available);
      const outOfStock = ingredients.filter(ing => ing.stock === 0);
      const unavailable = ingredients.filter(ing => !ing.available);

      // Calculate total inventory value (would need cost price, using sale price for now)
      const totalValue = ingredients.reduce((sum, ing) => sum + (ing.stock * 10), 0); // Placeholder

      // Most used ingredients in plates - Filter out deleted plates
      const ingredientUsage = ingredients.map(ing => ({
        ...ing,
        usedInPlates: ing.plateIngredients?.filter((pi: any) => !pi.plate.isDeleted).length || 0,
        plateNames: ing.plateIngredients?.filter((pi: any) => !pi.plate.isDeleted).map((pi: any) => pi.plate.name) || []
      })).sort((a, b) => b.usedInPlates - a.usedInPlates);

      const response: ApiResponse = {
        ok: true,
        data: {
          summary: {
            totalIngredients: ingredients.length,
            lowStock: lowStock.length,
            outOfStock: outOfStock.length,
            unavailable: unavailable.length,
            totalValue: Math.round(totalValue * 100) / 100
          },
          lowStock: lowStock.map(ing => ({
            id: ing.id,
            name: ing.name,
            stock: ing.stock
          })),
          outOfStock: outOfStock.map(ing => ({
            id: ing.id,
            name: ing.name,
            stock: ing.stock
          })),
          mostUsed: ingredientUsage.slice(0, 10).map(ing => ({
            id: ing.id,
            name: ing.name,
            stock: ing.stock,
            usedInPlates: ing.usedInPlates,
            plateNames: ing.plateNames
          })),
          leastUsed: ingredientUsage.slice(-10).reverse().map(ing => ({
            id: ing.id,
            name: ing.name,
            stock: ing.stock,
            usedInPlates: ing.usedInPlates,
            plateNames: ing.plateNames
          }))
        }
      };

      console.log(`📦 Inventory analytics: ${lowStock.length} low stock, ${outOfStock.length} out of stock`);
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // ===== USER MANAGEMENT =====

  /**
   * Get all users with pagination
   * GET /api/admin/users
   */
  static async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, search, role } = req.query;
      
      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
      const offset = (pageNum - 1) * limitNum;

      // Build where clause
      const whereClause: any = {};
      
      if (search && typeof search === 'string') {
        whereClause.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ];
      }

      if (role && typeof role === 'string') {
        whereClause.role = role;
      }

      // Get users with count and stats
      const [users, totalCount] = await Promise.all([
        prisma.user.findMany({
          where: whereClause,
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            role: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limitNum
        }),
        prisma.user.count({ where: whereClause })
      ]);

      // Get order counts separately
      const userIds = users.map(u => u.id);
      const orderCounts = await prisma.order.groupBy({
        by: ['userId'],
        where: {
          userId: { in: userIds },
          paymentStatus: 'completed'
        },
        _count: {
          id: true
        }
      });

      const orderCountMap = orderCounts.reduce((acc, oc) => {
        acc[oc.userId] = oc._count.id;
        return acc;
      }, {} as Record<string, number>);

      // Get total revenue per user
      const userRevenues = await prisma.order.groupBy({
        by: ['userId'],
        where: {
          userId: { in: userIds },
          paymentStatus: 'completed'
        },
        _sum: {
          totalPrice: true
        }
      });

      const revenueMap = userRevenues.reduce((acc, ur) => {
        acc[ur.userId] = Number(ur._sum.totalPrice || 0);
        return acc;
      }, {} as Record<string, number>);

      // Format response
      const formattedUsers = users.map(user => ({
        ...user,
        totalOrders: orderCountMap[user.id] || 0,
        totalRevenue: Math.round((revenueMap[user.id] || 0) * 100) / 100
      }));

      const response: ApiResponse = {
        ok: true,
        data: formattedUsers,
        meta: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          hasNext: offset + limitNum < totalCount,
          hasPrev: pageNum > 1,
          filters: { search, role }
        }
      };

      console.log(`👥 Admin fetched ${users.length}/${totalCount} users`);
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user role
   * PUT /api/admin/users/:id/role
   */
  static async updateUserRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!id) {
        throw new CustomError('User ID is required', 400);
      }

      if (!['customer', 'employee', 'admin'].includes(role)) {
        throw new CustomError('Invalid role. Must be customer, employee, or admin', 400);
      }

      // Check if user exists - Use email as backup identifier
      const user = await prisma.user.findFirst({
        where: { 
          OR: [
            { id: id },
            { email: { contains: id } } // Fallback in case id is actually email
          ]
        },
        select: { id: true, email: true, name: true, role: true }
      });

      if (!user) {
        throw new CustomError('User not found', 404);
      }

      // Update role using the found user's actual ID
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { role },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          updatedAt: true
        }
      });

      const response: ApiResponse = {
        ok: true,
        data: updatedUser,
        meta: {
          previousRole: user.role,
          newRole: role
        }
      };

      console.log(`👤 Admin updated user role: ${user.email} (${user.role} → ${role})`);
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get system overview
   * GET /api/admin/overview
   */
  static async getSystemOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Get various counts and stats in parallel
      const [
        totalUsers,
        totalIngredients,
        totalPlates,
        activeOrders,
        todayOrders,
        weekOrders,
        monthRevenue,
        lowStockIngredients,
        unavailablePlates
      ] = await Promise.all([
        prisma.user.count({ where: { role: 'customer' } }),
        prisma.ingredient.count({ where: { available: true } }),
        prisma.plate.count({ where: { available: true } }),
        prisma.order.count({
          where: {
            status: { in: ['confirmed', 'preparing', 'ready'] },
            paymentStatus: 'completed'
          }
        }),
        prisma.order.count({
          where: {
            createdAt: { gte: today },
            paymentStatus: 'completed'
          }
        }),
        prisma.order.count({
          where: {
            createdAt: { gte: thisWeek },
            paymentStatus: 'completed'
          }
        }),
        prisma.order.aggregate({
          where: {
            createdAt: { gte: thisMonth },
            paymentStatus: 'completed'
          },
          _sum: { totalPrice: true }
        }),
        prisma.ingredient.count({
          where: {
            available: true,
            stock: { lte: 5 }
          }
        }),
        prisma.plate.count({
          where: { available: false }
        })
      ]);

      // Recent activity (last 10 orders)
      const recentOrders = await prisma.order.findMany({
        where: { paymentStatus: 'completed' },
        include: {
          user: {
            select: { name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      const formattedRecentOrders = recentOrders.map(order => ({
        id: order.id,
        customerName: order.user.name,
        totalPrice: typeof order.totalPrice === 'number' ? order.totalPrice : Number(order.totalPrice),
        status: order.status,
        createdAt: order.createdAt
      }));

      const response: ApiResponse = {
        ok: true,
        data: {
          summary: {
            totalUsers,
            totalIngredients,
            totalPlates,
            activeOrders,
            lowStockIngredients,
            unavailablePlates
          },
          metrics: {
            todayOrders,
            weekOrders,
            monthRevenue: Math.round(Number(monthRevenue._sum.totalPrice || 0) * 100) / 100
          },
          alerts: {
            lowStock: lowStockIngredients > 0,
            unavailablePlates: unavailablePlates > 0,
            activeOrdersHigh: activeOrders > 10
          },
          recentActivity: formattedRecentOrders
        }
      };

      console.log(`📊 Admin system overview: ${totalUsers} users, ${activeOrders} active orders`);
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get suggestions queue for admin approval
   * GET /api/admin/suggestions
   */
  static async getSuggestions(req: Request, res: Response, next: NextFunction) {
    try {
      const { status = 'pending', page = 1, limit = 20 } = req.query;
      
      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
      const offset = (pageNum - 1) * limitNum;

      const whereClause: any = {};
      if (status && status !== 'all') {
        whereClause.status = status;
      }

      const [suggestions, totalCount] = await Promise.all([
        prisma.suggestion.findMany({
          where: whereClause,
          include: {
            user: {
              select: { name: true, email: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limitNum
        }),
        prisma.suggestion.count({ where: whereClause })
      ]);

      // Parse JSON fields
      const formattedSuggestions = suggestions.map(sugg => ({
        ...sugg,
        extractedEntities: parseJsonArray(sugg.extractedEntities),
        fuzzyCandidates: parseJsonArray(sugg.fuzzyCandidates),
        user: sugg.user
      }));

      const response: ApiResponse = {
        ok: true,
        data: formattedSuggestions,
        meta: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          hasNext: offset + limitNum < totalCount,
          hasPrev: pageNum > 1,
          filters: { status }
        }
      };

      console.log(`💡 Admin fetched ${suggestions.length}/${totalCount} suggestions`);
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Approve or reject suggestion
   * PUT /api/admin/suggestions/:id
   */
  static async updateSuggestion(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, adminNotes } = req.body;

      if (!id) {
        throw new CustomError('Suggestion ID is required', 400);
      }

      if (!['approved', 'rejected'].includes(status)) {
        throw new CustomError('Status must be approved or rejected', 400);
      }

      // Check if suggestion exists
      const suggestion = await prisma.suggestion.findUnique({
        where: { id }
      });

      if (!suggestion) {
        throw new CustomError('Suggestion not found', 404);
      }

      if (suggestion.status !== 'pending') {
        throw new CustomError('Suggestion has already been processed', 400);
      }

      // Update suggestion
      const updatedSuggestion = await prisma.suggestion.update({
        where: { id },
        data: {
          status,
          adminNotes,
          updatedAt: new Date()
        },
        include: {
          user: {
            select: { name: true, email: true }
          }
        }
      });

      const response: ApiResponse = {
        ok: true,
        data: {
          ...updatedSuggestion,
          extractedEntities: parseJsonArray(updatedSuggestion.extractedEntities),
          fuzzyCandidates: parseJsonArray(updatedSuggestion.fuzzyCandidates)
        }
      };

      console.log(`💡 Admin ${status} suggestion: ${suggestion.originalText}`);
      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}