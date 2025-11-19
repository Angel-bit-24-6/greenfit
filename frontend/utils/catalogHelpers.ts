import { Catalog, Ingredient, Plate, IngredientDetail } from '../types/domain';
import { getNetworkConfig } from '../hooks/useNetworkConfig';

/**
 * Get ingredient by ID from catalog
 */
export const getIngredientById = (catalog: Catalog, ingredientId: string): Ingredient | null => {
  return catalog.ingredients.find(ing => ing.id === ingredientId) || null;
};

/**
 * Get plate by ID from catalog
 */
export const getPlateById = (catalog: Catalog, plateId: string): Plate | null => {
  return catalog.plates.find(plate => plate.id === plateId) || null;
};

/**
 * Get base ingredients for a plate (from the plate definition)
 * These are the ingredients that come with the plate by default
 */
export const getPlateBaseIngredients = async (plateId: string): Promise<IngredientDetail[]> => {
  try {
    const networkConfig = getNetworkConfig();
    // Fetch plate ingredients from the backend
    const response = await fetch(`${networkConfig.API_BASE_URL}/catalog/plates/${plateId}/ingredients`);
    
    if (!response.ok) {
      console.error('Failed to fetch plate ingredients');
      return [];
    }
    
    const data = await response.json();
    
    if (data.ok && data.data && data.data.ingredients) {
      return data.data.ingredients
        .filter((ingredient: any) => ingredient && typeof ingredient === 'object')
        .map((ingredient: any) => ({
          id: ingredient.id || 'unknown',
          name: ingredient.name || 'Unknown Ingredient',
          price: ingredient.price || 0,
          quantity: ingredient.quantity || 1,
          isCustom: false
        }));
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching plate ingredients:', error);
    return [];
  }
};

/**
 * Convert ingredient IDs to detailed ingredients
 */
export const getIngredientsDetails = (
  catalog: Catalog, 
  ingredientIds: string[], 
  isCustom: boolean = true
): IngredientDetail[] => {
  return ingredientIds
    .map(id => getIngredientById(catalog, id))
    .filter((ing): ing is Ingredient => ing !== null)
    .map(ing => ({
      id: ing.id || 'unknown',
      name: ing.name || 'Unknown Ingredient',
      price: ing.price || 0,
      quantity: 1,
      isCustom
    }));
};

/**
 * Calculate total price for custom ingredients only
 */
export const calculateCustomIngredientsPrice = (ingredients: IngredientDetail[]): number => {
  return ingredients
    .filter(ing => ing.isCustom)
    .reduce((total, ing) => total + (ing.price * ing.quantity), 0);
};

/**
 * Get formatted price display
 */
export const formatPrice = (price: number | any): string => {
  // Handle PostgreSQL Decimal conversion
  const numericPrice = typeof price === 'number' ? price : Number(price || 0);
  return `$${numericPrice.toFixed(2)}`;
};

/**
 * Get ingredient display name with quantity
 */
export const getIngredientDisplayName = (ingredient: IngredientDetail): string => {
  const quantityText = ingredient.quantity > 1 ? ` x${ingredient.quantity}` : '';
  const name = ingredient.name || 'Unknown Ingredient';
  return `${name}${quantityText}`;
};