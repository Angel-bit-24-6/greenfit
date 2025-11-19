import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { IngredientDetail } from '../types/domain';
import { formatPrice, getIngredientDisplayName } from '../utils/catalogHelpers';

interface IngredientsListProps {
  title: string;
  ingredients: IngredientDetail[];
  showPrices: boolean; // true for custom ingredients, false for base ingredients
  showSubtotal?: boolean;
}

export const IngredientsList: React.FC<IngredientsListProps> = ({
  title,
  ingredients,
  showPrices,
  showSubtotal = false
}) => {
  const subtotal = showPrices 
    ? ingredients.reduce((total, ing) => total + (ing.price * ing.quantity), 0)
    : 0;

  if (ingredients.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      
      {ingredients.map((ingredient, index) => {
        // Safety check for ingredient object
        if (!ingredient || typeof ingredient !== 'object') {
          console.warn(`⚠️ Invalid ingredient at index ${index}:`, ingredient);
          return null;
        }

        // Ensure all required properties exist with fallbacks
        const safeIngredient = {
          id: ingredient.id || `unknown-${index}`,
          name: ingredient.name || 'Unknown Ingredient',
          price: ingredient.price || 0,
          quantity: ingredient.quantity || 1,
          isCustom: ingredient.isCustom || false
        };

        return (
          <View key={`${safeIngredient.id}-${index}-${safeIngredient.isCustom ? 'custom' : 'base'}`} style={styles.ingredientRow}>
            <View style={styles.ingredientInfo}>
              <Text style={styles.ingredientName}>
                {getIngredientDisplayName(safeIngredient)}
              </Text>
              {safeIngredient.isCustom && (
                <Text style={styles.customLabel}>Added by you</Text>
              )}
            </View>
            
            {showPrices && (
              <View style={styles.priceInfo}>
                {safeIngredient.quantity > 1 && (
                  <Text style={styles.unitPrice}>
                    {formatPrice(safeIngredient.price)} ea.
                  </Text>
                )}
                <Text style={styles.totalPrice}>
                  {formatPrice(safeIngredient.price * safeIngredient.quantity)}
                </Text>
              </View>
            )}
          </View>
        );
      })}

      {showSubtotal && subtotal > 0 && (
        <View style={[styles.ingredientRow, styles.subtotalRow]}>
          <Text style={styles.subtotalLabel}>Extras Subtotal:</Text>
          <Text style={styles.subtotalPrice}>{formatPrice(subtotal)}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  ingredientInfo: {
    flex: 1,
    marginRight: 12,
  },
  ingredientName: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 2,
  },
  customLabel: {
    fontSize: 12,
    color: '#6366f1',
    fontStyle: 'italic',
  },
  priceInfo: {
    alignItems: 'flex-end',
  },
  unitPrice: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 2,
  },
  totalPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  subtotalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    borderBottomWidth: 0,
  },
  subtotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  subtotalPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
});