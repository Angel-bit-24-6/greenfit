import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useProductStore, ProductCategory } from '../../stores/productStore';
import { useCartStore } from '../../stores/cartStore';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { useThemeStore } from '../../stores/themeStore';
import { ToastManager } from '../../utils/ToastManager';
import { AlertManager } from '../../utils/AlertManager';

const CATEGORIES: { id: ProductCategory | null; name: string; emoji: string }[] = [
  { id: null, name: 'Todos', emoji: '📦' },
  { id: 'FRUITS', name: 'Frutas', emoji: '🍎' },
  { id: 'VEGETABLES', name: 'Verduras', emoji: '🥬' },
  { id: 'LEGUMES', name: 'Leguminosas', emoji: '🫘' },
  { id: 'HERBS', name: 'Hierbas', emoji: '🌿' },
  { id: 'SNACKS', name: 'Snacks', emoji: '🍪' },
  { id: 'COFFEE', name: 'Café', emoji: '☕' },
  { id: 'CHOCOLATE', name: 'Chocolate', emoji: '🍫' },
  { id: 'PROTEINS', name: 'Proteínas', emoji: '🥚' },
];

export const MenuScreen: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const { products, loading, error, fetchProducts, filterByCategory } = useProductStore();
  const { addItem } = useCartStore();
  const { canAddProduct, validateCategory, subscription } = useSubscriptionStore();
  const { getThemeColors, currentTheme, colorMode } = useThemeStore();
  const COLORS = getThemeColors();
  
  const styles = useMemo(() => createStyles(COLORS, colorMode), [currentTheme.id, colorMode]);

  useEffect(() => {
    fetchProducts({ available: true });
  }, []);

  useEffect(() => {
    if (selectedCategory !== null) {
      filterByCategory(selectedCategory);
    }
  }, [selectedCategory]);

  const handleAddToCart = async (product: any) => {
    try {
      if (!product.available || product.stock <= 0) {
        ToastManager.error('Producto no disponible', 'Este producto no está disponible actualmente');
        return;
      }

      if (!subscription) {
        AlertManager.alert('Suscripción Requerida', 'Necesitas un plan de suscripción activo para agregar productos al carrito.');
        return;
      }

      if (!validateCategory(product.category)) {
        AlertManager.alert(
          'Plan insuficiente',
          `Tu plan ${subscription?.plan} no permite productos de la categoría ${product.category}. Considera actualizar tu plan.`
        );
        return;
      }

      if (!canAddProduct(product.weightInKg)) {
        const remaining = subscription ? subscription.limitInKg - subscription.usedKg : 0;
        AlertManager.alert(
          'Límite excedido',
          `No puedes agregar este producto. Te quedan ${remaining.toFixed(2)} kg disponibles.`
        );
        return;
      }

      const success = await addItem(product, 1);

      if (success) {
        ToastManager.addedToCart(product.name, product.weightInKg);
      } else {
        ToastManager.error('Error al agregar', 'No se pudo agregar al carrito. Inténtalo de nuevo.');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      ToastManager.error('Error', 'Ocurrió un error inesperado.');
    }
  };

  const renderProductItem = ({ item }: { item: any }) => {
    const canAdd = item.available && item.stock > 0 && canAddProduct(item.weightInKg) && validateCategory(item.category);
    
    return (
      <View
        style={[styles.itemCard, { 
          backgroundColor: COLORS.background,
          borderColor: canAdd ? COLORS.border : COLORS.error
        }]}
      >
        <View style={styles.cardContent}>
          <View style={styles.itemHeader}>
            <View style={styles.itemTitleContainer}>
              <Text style={[styles.itemName, { color: COLORS.text }]} numberOfLines={2}>
                {item.name}
              </Text>
            </View>
            <View style={styles.weightContainer}>
              <Text style={styles.weightText}>
                {item.weightInKg.toFixed(2)} kg
              </Text>
            </View>
          </View>
          
          {item.description && (
            <Text style={[styles.itemDescription, { color: COLORS.textSecondary }]} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          
          {item.tags && Array.isArray(item.tags) && item.tags.length > 0 && (
            <View style={styles.itemTags}>
              {item.tags.slice(0, 3).map((tag: string) => (
                <View 
                  key={tag} 
                  style={styles.tag}
                >
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
              {item.tags.length > 3 && (
                <View style={[styles.tag, { borderColor: COLORS.textSecondary }]}>
                  <Text style={[styles.tagText, { color: COLORS.textSecondary }]}>+{item.tags.length - 3}</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.itemFooter}>
            <View style={styles.itemMeta}>
              <View style={styles.metaRow}>
                <Text style={styles.metaIcon}>🧑‍🌾</Text>
                <Text style={styles.metaText}>
                  {item.producer?.businessName || 'Desconocido'}
                </Text>
              </View>
              {(!item.available || item.stock <= 0) && (
                <View style={styles.availabilityBadge}>
                  <Text style={styles.availabilityText}>No disponible</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={[
                styles.addButton,
                { 
                  borderColor: canAdd ? COLORS.primary : COLORS.error,
                  backgroundColor: canAdd ? 'transparent' : COLORS.error,
                }
              ]}
              onPress={() => handleAddToCart(item)}
              disabled={!canAdd}
              activeOpacity={0.6}
            >
              <Text style={[
                styles.addButtonText,
                { 
                  color: canAdd ? COLORS.primary : COLORS.background,
                }
              ]}>
                {canAdd ? '+' : '✕'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading && products.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={[styles.loadingText, { color: COLORS.textSecondary }]}>Cargando productos...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: COLORS.background }]}>
        <Text style={[styles.errorText, { color: COLORS.error }]}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      {/* Category Filter Chips */}
      <View style={[styles.categoryChipsContainer, { backgroundColor: COLORS.surface, borderBottomColor: COLORS.border }]}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item) => item.id || 'all'}
          renderItem={({ item: category }) => (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                {
                  backgroundColor: selectedCategory === category.id ? COLORS.primary : COLORS.background,
                  borderColor: selectedCategory === category.id ? COLORS.primary : COLORS.border,
                }
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Text style={styles.categoryEmoji}>{category.emoji}</Text>
              <Text style={[
                styles.categoryChipText,
                { color: selectedCategory === category.id ? COLORS.background : COLORS.textSecondary }
              ]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.categoryChipsContent}
        />
      </View>

      {/* Products List */}
      <FlatList
        data={products}
        renderItem={renderProductItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: COLORS.textSecondary }]}>
              No hay productos disponibles en esta categoría
            </Text>
          </View>
        }
      />
    </View>
  );
};

const createStyles = (COLORS: any, colorMode: 'dark' | 'light') => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    margin: 16,
    borderRadius: 20,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    // Eliminamos sombras para mantenerlo plano
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  activeTab: {
    // backgroundColor is set dynamically
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.background,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },

  // --- TARJETAS MODIFICADAS ---
  itemCard: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    marginBottom: 12,
    marginHorizontal: 2,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 16, // Menos padding para mayor densidad
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '700', // Negrita para mayor impacto
    color: COLORS.text,
    lineHeight: 24,
  },
  weightContainer: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  weightText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  categoryChipsContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  categoryChipsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryChipText: {
    fontWeight: '600',
    fontSize: 13,
  },
  itemDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
    fontWeight: '400',
  },
  itemTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    // Borde en lugar de fondo
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary, // Color primario para los tags
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1, // Línea divisoria sutil
    borderTopColor: COLORS.border,
  },
  itemMeta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaIcon: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  availabilityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: COLORS.error, // Color de error para "no disponible"
  },
  availabilityText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.background, // Texto blanco sobre fondo rojo
    letterSpacing: 0.1,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    // Botón con borde y sin fondo por defecto
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  addButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary, // Color primario para el texto del botón
  },
  infoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.textSecondary,
  },
  infoButtonText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 17,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
});