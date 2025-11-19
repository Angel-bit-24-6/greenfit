import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useCatalogStore } from '../../stores/catalogStore';
import { useCartStore } from '../../stores/cartStore';
import { useConfigStore } from '../../stores/configStore';
import { Button } from '../../components/ui/Button';
import { ToastManager } from '../../utils/ToastManager';

interface SelectedIngredient {
  id: string;
  name: string;
  price: number;
  quantity: number;
  tags: string[];
}

interface IngredientCardProps {
  ingredient: any;
  isSelected: boolean;
  selectedQuantity: number;
  onToggle: (ingredient: any) => void;
  onQuantityChange: (ingredientId: string, quantity: number) => void;
}

const IngredientCard: React.FC<IngredientCardProps> = ({
  ingredient,
  isSelected,
  selectedQuantity,
  onToggle,
  onQuantityChange,
}) => {
  const canSelect = ingredient.available && ingredient.stock > 0;

  return (
    <TouchableOpacity
      style={[
        styles.ingredientCard,
        isSelected && styles.selectedCard,
        !canSelect && styles.disabledCard,
      ]}
      onPress={() => canSelect && onToggle(ingredient)}
      disabled={!canSelect}
    >
      <View style={styles.cardHeader}>
        <View style={styles.ingredientInfo}>
          <Text style={[
            styles.ingredientName,
            !canSelect && styles.disabledText
          ]}>
            {ingredient.name}
          </Text>
          <Text style={styles.ingredientPrice}>
            ${ingredient.price?.toFixed(2) || '0.00'}
          </Text>
        </View>
        
        <View style={styles.stockInfo}>
          <Text style={[
            styles.stockText,
            ingredient.stock <= 5 && ingredient.stock > 0 && styles.lowStockText,
            ingredient.stock === 0 && styles.outStockText
          ]}>
            {ingredient.stock > 0 ? `Stock: ${ingredient.stock}` : 'Agotado'}
          </Text>
          {isSelected && (
            <View style={styles.checkmark}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
          )}
        </View>
      </View>

      {/* Tags */}
      <View style={styles.tagsContainer}>
        {ingredient.tags?.map((tag: string) => (
          <View key={tag} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>

      {/* Quantity selector for selected ingredients */}
      {isSelected && (
        <View style={styles.quantitySelector}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => onQuantityChange(ingredient.id, Math.max(1, selectedQuantity - 1))}
          >
            <Text style={styles.quantityButtonText}>-</Text>
          </TouchableOpacity>
          
          <Text style={styles.quantityText}>{selectedQuantity}</Text>
          
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => onQuantityChange(ingredient.id, Math.min(ingredient.stock, selectedQuantity + 1))}
          >
            <Text style={styles.quantityButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

export const CustomPlateBuilderScreen: React.FC = () => {
  const [selectedIngredients, setSelectedIngredients] = useState<SelectedIngredient[]>([]);
  const [plateName, setPlateName] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { catalog } = useCatalogStore();
  const { addItem } = useCartStore();
  const { appConfig } = useConfigStore();

  const maxIngredients = appConfig?.features?.customPlates?.maxIngredients || 6;
  const availableIngredients = catalog?.ingredients?.filter(ing => ing.available && ing.stock > 0) || [];

  useEffect(() => {
    // Generate default name when ingredients change
    if (selectedIngredients.length > 0) {
      const mainIngredients = selectedIngredients.slice(0, 2).map(ing => ing.name).join(' & ');
      const suffix = selectedIngredients.length > 2 ? ` +${selectedIngredients.length - 2} más` : '';
      setPlateName(`Mi Bowl ${mainIngredients}${suffix}`);
    } else {
      setPlateName('');
    }
  }, [selectedIngredients]);

  const handleIngredientToggle = (ingredient: any) => {
    const isSelected = selectedIngredients.find(item => item.id === ingredient.id);
    
    if (isSelected) {
      // Remove ingredient
      setSelectedIngredients(prev => prev.filter(item => item.id !== ingredient.id));
      ToastManager.info(
        '🗑️ Ingrediente removido',
        `${ingredient.name} eliminado de tu platillo`,
        2000
      );
    } else {
      // Check limits
      if (selectedIngredients.length >= maxIngredients) {
        ToastManager.limitReached(maxIngredients, 'ingredientes');
        return;
      }
      
      // Add ingredient
      setSelectedIngredients(prev => [...prev, {
        id: ingredient.id,
        name: ingredient.name,
        price: ingredient.price || 0,
        quantity: 1,
        tags: ingredient.tags || []
      }]);
      
      ToastManager.success(
        '✅ Ingrediente agregado',
        `${ingredient.name} añadido a tu platillo`,
        2000
      );
    }
  };

  const handleQuantityChange = (ingredientId: string, quantity: number) => {
    setSelectedIngredients(prev =>
      prev.map(item =>
        item.id === ingredientId ? { ...item, quantity } : item
      )
    );
  };

  const calculateTotal = () => {
    return selectedIngredients.reduce((total, item) => total + ((item.price || 0) * item.quantity), 0);
  };

  const handleAddToCart = async () => {
    if (selectedIngredients.length === 0) {
      ToastManager.warning(
        '⚠️ Sin ingredientes',
        'Selecciona al menos un ingrediente para crear tu platillo'
      );
      return;
    }

    setLoading(true);

    try {
      const customIngredients = selectedIngredients.map(item => 
        Array(item.quantity).fill(item.id)
      ).flat();

      const totalPrice = calculateTotal();
      const finalPlateName = plateName || 'Platillo Personalizado';
      
      addItem({
        type: 'custom',
        customIngredients,
        quantity: 1,
        price: totalPrice,
        name: finalPlateName,
        image: undefined
      });

      // Show success toast
      ToastManager.customPlateCreated(finalPlateName, totalPrice);

      // Auto-clear ingredients after successful add
      setTimeout(() => {
        setSelectedIngredients([]);
        setPlateName('');
      }, 1500); // Wait for toast to be visible

    } catch (error) {
      console.error('Error adding custom plate to cart:', error);
      ToastManager.error(
        '❌ Error',
        'No se pudo agregar el platillo al carrito. Inténtalo de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  };

  const renderIngredient = ({ item }: { item: any }) => {
    const selectedItem = selectedIngredients.find(selected => selected.id === item.id);
    
    return (
      <IngredientCard
        ingredient={item}
        isSelected={!!selectedItem}
        selectedQuantity={selectedItem?.quantity || 1}
        onToggle={handleIngredientToggle}
        onQuantityChange={handleQuantityChange}
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🎨 Crear Platillo Personalizado</Text>
        <Text style={styles.subtitle}>
          Selecciona hasta {maxIngredients} ingredientes para crear tu platillo único
        </Text>
      </View>

      {/* Preview */}
      {selectedIngredients.length > 0 && (
        <View style={styles.preview}>
          <Text style={styles.previewTitle}>{plateName}</Text>
          <Text style={styles.previewIngredients}>
            {selectedIngredients.map(item => 
              `${item.name}${item.quantity > 1 ? ` x${item.quantity}` : ''}`
            ).join(', ')}
          </Text>
          <Text style={styles.previewPrice}>
            Total: ${calculateTotal().toFixed(2)}
          </Text>
          <Text style={styles.ingredientCount}>
            {selectedIngredients.length}/{maxIngredients} ingredientes
          </Text>
        </View>
      )}

      {/* Ingredients List */}
      <FlatList
        data={availableIngredients}
        renderItem={renderIngredient}
        keyExtractor={(item) => item.id}
        style={styles.ingredientsList}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No hay ingredientes disponibles en este momento
            </Text>
          </View>
        }
      />

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="Limpiar Todo"
          onPress={() => {
            if (selectedIngredients.length > 0) {
              setSelectedIngredients([]);
              setPlateName('');
              ToastManager.info(
                '🧹 Platillo limpiado',
                'Todos los ingredientes han sido removidos',
                2000
              );
            }
          }}
          variant="outline"
          style={styles.clearButton}
          disabled={selectedIngredients.length === 0}
        />
        
        <Button
          title={loading ? 'Agregando...' : `🛒 Agregar ($${calculateTotal().toFixed(2)})`}
          onPress={handleAddToCart}
          disabled={selectedIngredients.length === 0 || loading}
          style={styles.addButton}
          size="large"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    paddingTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
    lineHeight: 22,
  },
  preview: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  previewIngredients: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  previewPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  ingredientCount: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  ingredientsList: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  ingredientCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: '#22c55e',
    backgroundColor: '#f0fdf4',
  },
  disabledCard: {
    backgroundColor: '#f9fafb',
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  disabledText: {
    color: '#9ca3af',
  },
  ingredientPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  stockInfo: {
    alignItems: 'flex-end',
  },
  stockText: {
    fontSize: 12,
    color: '#6b7280',
  },
  lowStockText: {
    color: '#f59e0b',
    fontWeight: '600',
  },
  outStockText: {
    color: '#ef4444',
    fontWeight: '600',
  },
  checkmark: {
    backgroundColor: '#22c55e',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  checkmarkText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  tag: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  quantityButton: {
    backgroundColor: '#22c55e',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginHorizontal: 16,
    minWidth: 24,
    textAlign: 'center',
  },
  actions: {
    backgroundColor: 'white',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  clearButton: {
    flex: 0.3,
  },
  addButton: {
    flex: 0.65,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
});