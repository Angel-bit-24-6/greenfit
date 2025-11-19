import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Check if a plate is available based on ingredient stock
 */
export async function checkPlateAvailability(plateId: string): Promise<boolean> {
  try {
    const plate = await prisma.plate.findUnique({
      where: { id: plateId },
      include: {
        ingredients: {
          include: {
            ingredient: true
          }
        }
      }
    });

    if (!plate || !plate.available) {
      return false;
    }

    // Check if all ingredients are available and have sufficient stock
    for (const plateIngredient of plate.ingredients) {
      const ingredient = plateIngredient.ingredient;
      const requiredQuantity = plateIngredient.quantity;

      if (!ingredient.available || ingredient.stock < requiredQuantity) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error checking plate availability:', error);
    return false;
  }
}

/**
 * Update all plates availability based on ingredient stock
 */
export async function updatePlateAvailability(): Promise<void> {
  try {
    const plates = await prisma.plate.findMany({
      include: {
        ingredients: {
          include: {
            ingredient: true
          }
        }
      }
    });

    for (const plate of plates) {
      let isAvailable = true;

      // Check each ingredient
      for (const plateIngredient of plate.ingredients) {
        const ingredient = plateIngredient.ingredient;
        const requiredQuantity = plateIngredient.quantity;

        if (!ingredient.available || ingredient.stock < requiredQuantity) {
          isAvailable = false;
          break;
        }
      }

      // Update plate availability if it changed
      if (plate.available !== isAvailable) {
        await prisma.plate.update({
          where: { id: plate.id },
          data: { available: isAvailable }
        });

        console.log(`📦 Updated "${plate.name}" availability: ${isAvailable}`);
      }
    }

    console.log('✅ Plate availability updated based on ingredient stock');
  } catch (error) {
    console.error('❌ Error updating plate availability:', error);
  }
}

/**
 * Check if cart items are available before checkout
 */
export async function validateCartAvailability(items: any[]): Promise<{
  valid: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  for (const item of items) {
    if (item.type === 'plate' && item.plateId) {
      const isAvailable = await checkPlateAvailability(item.plateId);
      if (!isAvailable) {
        issues.push(`"${item.name}" is no longer available`);
      }
    } else if (item.type === 'custom' && item.customIngredients) {
      for (const ingredientId of item.customIngredients) {
        const ingredient = await prisma.ingredient.findUnique({
          where: { id: ingredientId }
        });

        if (!ingredient || !ingredient.available || ingredient.stock < item.quantity) {
          issues.push(`Ingredient for custom plate is not available`);
          break;
        }
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues
  };
}