import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useProductStore, type ProductCategory } from '../../stores/productStore';
import { useCartStore } from '../../stores/cartStore';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { useThemeStore } from '../../stores/themeStore';
import type { RootStackParamList } from '../../navigation/AppNavigator';
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

export const CatalogScreen: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
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
    if (!product.available) {
      ToastManager.error('Producto no disponible', 'Este producto no está disponible actualmente');
      return;
    }

    // Validar categoría según plan
    if (!validateCategory(product.category)) {
      AlertManager.alert(
        'Plan insuficiente',
        `Tu plan ${subscription?.plan} no permite productos de la categoría ${product.category}. Considera actualizar tu plan.`
      );
      return;
    }

    // Validar peso
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
      ToastManager.error('Error', 'No se pudo agregar al carrito');
    }
  };

  const renderProduct = ({ item }: { item: any }) => (
    <View
      style={[styles.productItem, { borderColor: COLORS.border }]}
    >
      <View style={styles.productContent}>
        <View style={styles.productHeader}>
          <View style={styles.productInfo}>
            <Text style={[styles.productName, { color: COLORS.text }]} numberOfLines={2}>
              {item.name}
            </Text>
            {item.producer && (
              <Text style={[styles.producerName, { color: COLORS.textSecondary }]} numberOfLines={1}>
                {item.producer.businessName}
              </Text>
            )}
          </View>
          <View style={[styles.weightBadge, { borderColor: COLORS.primary }]}>
            <Text style={[styles.weightText, { color: COLORS.primary }]}>
              {item.weightInKg} kg
            </Text>
          </View>
        </View>

        {item.description && (
          <Text style={[styles.productDescription, { color: COLORS.textSecondary }]} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        {item.origin && (
          <Text style={[styles.productOrigin, { color: COLORS.textSecondary }]}>
            📍 {item.origin}
          </Text>
        )}

        <View style={styles.productFooter}>
          <View style={styles.categoryTag}>
            <Text style={[styles.categoryText, { color: COLORS.textSecondary }]}>
              {CATEGORIES.find(c => c.id === item.category)?.emoji} {CATEGORIES.find(c => c.id === item.category)?.name}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.addButton,
              {
                borderColor: item.available && canAddProduct(item.weightInKg) && validateCategory(item.category)
                  ? COLORS.primary
                  : COLORS.border,
                backgroundColor: item.available && canAddProduct(item.weightInKg) && validateCategory(item.category)
                  ? 'transparent'
                  : COLORS.surfaceElevated,
              },
            ]}
            onPress={() => handleAddToCart(item)}
            disabled={!item.available || !canAddProduct(item.weightInKg) || !validateCategory(item.category)}
            activeOpacity={0.6}
          >
            <Text
              style={[
                styles.addButtonText,
                {
                  color: item.available && canAddProduct(item.weightInKg) && validateCategory(item.category)
                    ? COLORS.primary
                    : COLORS.textSecondary,
                },
              ]}
            >
              {item.available ? '+' : '✕'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading && products.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={[styles.loadingText, { color: COLORS.textSecondary }]}>
          Cargando productos...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: COLORS.background }]}>
        <Text style={[styles.errorText, { color: COLORS.error }]}>
          Error: {error}
        </Text>
      </View>
    );
  }

  const filteredProducts = selectedCategory
    ? products.filter(p => p.category === selectedCategory)
    : products;

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      {/* Category Filter */}
      <View style={[styles.categoryContainer, { borderBottomColor: COLORS.border }]}>
        <FlatList
          horizontal
          data={CATEGORIES}
          keyExtractor={(item) => item.id || 'all'}
          renderItem={({ item }) => {
            const isSelected = selectedCategory === item.id;
            return (
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: isSelected ? COLORS.primary : COLORS.surface,
                    borderColor: isSelected ? COLORS.primary : COLORS.border,
                  },
                ]}
                onPress={() => setSelectedCategory(item.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.categoryEmoji}>{item.emoji}</Text>
                <Text
                  style={[
                    styles.categoryChipText,
                    {
                      color: isSelected ? COLORS.background : COLORS.text,
                    },
                  ]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          }}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
        />
      </View>

      {/* Products List */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: COLORS.textSecondary }]}>
              No hay productos disponibles
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
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
  },
  categoryContainer: {
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  categoryList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  categoryEmoji: {
    fontSize: 16,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  productItem: {
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    marginBottom: 12,
  },
  productContent: {
    padding: 16,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  producerName: {
    fontSize: 13,
  },
  weightBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  weightText: {
    fontSize: 14,
    fontWeight: '700',
  },
  productDescription: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  productOrigin: {
    fontSize: 12,
    marginBottom: 12,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  categoryTag: {
    flex: 1,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '500',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  addButtonText: {
    fontSize: 20,
    fontWeight: '700',
  },
  emptyState: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});

