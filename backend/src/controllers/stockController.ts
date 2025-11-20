import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schema
const validateStockSchema = z.object({
  items: z.array(z.object({
    type: z.enum(['plate', 'custom']),
    plateId: z.string().optional(),
    customIngredients: z.array(z.string()).optional(),
    quantity: z.number().int().min(1),
    name: z.string().min(1),
  }))
});

export class StockController {
  /**
   * Validate stock availability for cart items
   * POST /api/stock/validate
   */
  static async validateStock(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = validateStockSchema.parse(req.body);
      const { items } = validatedData;

      const validationResults = [];
      let allValid = true;

      for (const item of items) {
        const result = {
          item: {
            type: item.type,
            plateId: item.plateId,
            name: item.name,
            quantity: item.quantity
          },
          valid: true,
          issues: [] as string[],
          availableStock: null as number | null
        };

        if (item.type === 'plate' && item.plateId) {
          // Validate plate availability and ingredient stock
          console.log(`🔍 Validating plate: ${item.plateId} (${item.name})`);
          const plate = await prisma.plate.findUnique({
            where: { id: item.plateId },
            include: { 
              ingredients: { 
                include: { ingredient: true } 
              } 
            },
          });

          if (!plate) {
            console.log(`❌ Plate not found: ${item.plateId}`);
            result.valid = false;
            result.issues.push(`Plate "${item.name}" not found`);
            allValid = false;
          } else if (!plate.available) {
            console.log(`❌ Plate not available: ${item.plateId}`);
            result.valid = false;
            result.issues.push(`Plate "${item.name}" is not available`);
            allValid = false;
          } else {
            console.log(`✅ Plate found: ${plate.name}, ingredients: ${plate.ingredients.length}`);
            // Check each ingredient in the plate
            if (plate.ingredients.length === 0) {
              console.log(`⚠️ Plate has no ingredients: ${item.plateId}`);
              // Plate with no ingredients is considered valid
            } else {
              for (const plateIngredient of plate.ingredients) {
                const requiredStock = plateIngredient.quantity * item.quantity;
                const availableStock = plateIngredient.ingredient.stock;

                console.log(`  - Ingredient: ${plateIngredient.ingredient.name}, Required: ${requiredStock}, Available: ${availableStock}`);

                if (!plateIngredient.ingredient.available) {
                  console.log(`  ❌ Ingredient not available: ${plateIngredient.ingredient.name}`);
                  result.valid = false;
                  result.issues.push(`Ingredient "${plateIngredient.ingredient.name}" is not available`);
                  allValid = false;
                } else if (availableStock < requiredStock) {
                  console.log(`  ❌ Insufficient stock: ${plateIngredient.ingredient.name}`);
                  result.valid = false;
                  result.issues.push(
                    `Insufficient stock for "${plateIngredient.ingredient.name}". ` +
                    `Required: ${requiredStock}, Available: ${availableStock}`
                  );
                  allValid = false;
                }
              }
            }
          }
        } else if (item.type === 'custom' && item.customIngredients) {
          // Validate custom ingredients stock
          for (const ingredientId of item.customIngredients) {
            const ingredient = await prisma.ingredient.findUnique({
              where: { id: ingredientId },
            });

            if (!ingredient) {
              result.valid = false;
              result.issues.push(`Ingredient with ID "${ingredientId}" not found`);
              allValid = false;
            } else if (!ingredient.available) {
              result.valid = false;
              result.issues.push(`Ingredient "${ingredient.name}" is not available`);
              allValid = false;
            } else if (ingredient.stock < item.quantity) {
              result.valid = false;
              result.issues.push(
                `Insufficient stock for "${ingredient.name}". ` +
                `Required: ${item.quantity}, Available: ${ingredient.stock}`
              );
              result.availableStock = ingredient.stock;
              allValid = false;
            }
          }
        }

        validationResults.push(result);
      }

      res.status(200).json({
        ok: true,
        message: allValid ? 'All items are available' : 'Some items have stock issues',
        data: {
          allValid,
          results: validationResults,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Stock validation error:', error);

      if (error instanceof z.ZodError) {
        res.status(400).json({
          ok: false,
          message: 'Invalid request data',
          errors: error.errors,
        });
        return;
      }

      res.status(500).json({
        ok: false,
        message: 'Failed to validate stock',
        error: process.env.NODE_ENV === 'development' ? error : undefined,
      });
    }
  }

  /**
   * Get current stock levels for specific ingredients
   * GET /api/stock/ingredients?ids=id1,id2,id3
   */
  static async getIngredientStock(req: Request, res: Response): Promise<void> {
    try {
      const { ids } = req.query;
      
      if (!ids || typeof ids !== 'string') {
        res.status(400).json({
          ok: false,
          message: 'Ingredient IDs are required',
        });
        return;
      }

      const ingredientIds = ids.split(',');
      
      const ingredients = await prisma.ingredient.findMany({
        where: {
          id: { in: ingredientIds }
        },
        select: {
          id: true,
          name: true,
          stock: true,
          available: true,
        }
      });

      res.status(200).json({
        ok: true,
        message: 'Stock levels retrieved successfully',
        data: ingredients
      });

    } catch (error) {
      console.error('❌ Get ingredient stock error:', error);

      res.status(500).json({
        ok: false,
        message: 'Failed to retrieve stock levels',
        error: process.env.NODE_ENV === 'development' ? error : undefined,
      });
    }
  }
}

export default StockController;
