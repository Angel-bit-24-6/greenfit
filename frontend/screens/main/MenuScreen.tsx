import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useCatalogStore } from '../../stores/catalogStore';
import { useCartStore } from '../../stores/cartStore';
import { useThemeStore } from '../../stores/themeStore';
import { Button } from '../../components/ui/Button';
import { ToastManager } from '../../utils/ToastManager';
import { AlertManager } from '../../utils/AlertManager';

export const MenuScreen: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<'plates' | 'ingredients'>('plates');
  const { catalog, loading, error } = useCatalogStore();
  const { addItem, error: cartError } = useCartStore();
  const { getThemeColors, currentTheme, colorMode } = useThemeStore();
  const COLORS = getThemeColors();
  
  // Create dynamic styles based on current theme and color mode
  const styles = useMemo(() => createStyles(COLORS, colorMode), [currentTheme.id, colorMode]);

  const handleAddToCart = async (item: any) => {
    try {
      if (selectedTab === 'plates') {
        // Validate item availability
        if (!item.available) {
          ToastManager.noStock(item.name);
          return;
        }

        // Validate price
        const itemPrice = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
        if (!itemPrice || itemPrice <= 0) {
          ToastManager.error('Error', 'El precio del item no es válido');
          return;
        }

        // Add to cart with validation
        console.log('🛒 Adding item to cart:', {
          type: 'plate',
          plateId: item.id,
          quantity: 1,
          price: itemPrice,
          name: item.name,
        });
        
        const success = await addItem({
          type: 'plate',
          plateId: item.id,
          quantity: 1,
          price: itemPrice,
          name: item.name,
          image: item.image || undefined
        });
        
        console.log('🛒 Add item result:', success);

        if (success) {
          // Show success toast
          ToastManager.addedToCart(item.name, item.price);
        } else {
          // addItem failed - get error from store for more specific message
          const errorMessage = cartError || 'No se pudo agregar al carrito';
          
          // Check for specific error types
          if (errorMessage.includes('Configuration not loaded')) {
            ToastManager.error('Error de configuración', 'La aplicación no está configurada correctamente');
          } else if (errorMessage.includes('Failed to validate stock') || errorMessage.includes('network')) {
            ToastManager.networkError();
          } else {
            ToastManager.error('Error al agregar', errorMessage);
          }
        }
      } else {
        // For ingredients - show info about custom plates
        AlertManager.confirm(
          'Crear platillo personalizado',
          'Los ingredientes se pueden usar en platillos personalizados.\n\n¿Te gustaría crear uno?',
          () => {
            ToastManager.info('Próximamente', 'Custom Plate Builder estará disponible pronto');
          }
        );
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      ToastManager.error('Error', 'No se pudo agregar al carrito. Inténtalo de nuevo.');
    }
  };

  const renderPlateItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      activeOpacity={0.92}
      style={[styles.itemCard, { 
        backgroundColor: COLORS.background,
        borderColor: item.available ? COLORS.border : COLORS.error
      }]}
      onPress={() => handleAddToCart(item)}
    >
      {/* Content Container */}
      <View style={styles.cardContent}>
        {/* Header with name and price */}
        <View style={styles.itemHeader}>
          <View style={styles.itemTitleContainer}>
            <Text style={[styles.itemName, { color: COLORS.text }]} numberOfLines={2}>
              {item.name}
            </Text>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.priceText}>
              ${item.price?.toFixed(2) || '0.00'}
            </Text>
          </View>
        </View>
        
        {/* Description */}
        {item.description && (
          <Text style={[styles.itemDescription, { color: COLORS.textSecondary }]} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        
        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
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

        {/* Footer with meta info and action button */}
        <View style={styles.itemFooter}>
          <View style={styles.itemMeta}>
            <View style={styles.metaRow}>
              <Text style={styles.metaIcon}>⏱️</Text>
              <Text style={styles.metaText}>
                {item.preparationTime || 10} min
              </Text>
            </View>
            {!item.available && (
              <View style={styles.availabilityBadge}>
                <Text style={styles.availabilityText}>No disponible</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={[
              styles.addButton,
              { 
                borderColor: item.available ? COLORS.primary : COLORS.error,
                backgroundColor: item.available ? 'transparent' : COLORS.error,
              }
            ]}
            onPress={() => handleAddToCart(item)}
            disabled={!item.available}
            activeOpacity={0.6}
          >
            <Text style={[
              styles.addButtonText,
              { 
                color: item.available ? COLORS.primary : COLORS.background,
              }
            ]}>
              {item.available ? '+' : '✕'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderIngredientItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      activeOpacity={0.92}
      style={[styles.itemCard, { 
        backgroundColor: COLORS.background,
        borderColor: COLORS.border
      }]}
    >
      {/* Content Container */}
      <View style={styles.cardContent}>
        {/* Header with name and price */}
        <View style={styles.itemHeader}>
          <View style={styles.itemTitleContainer}>
            <Text style={[styles.itemName, { color: COLORS.text }]} numberOfLines={2}>
              {item.name}
            </Text>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.priceText}>
              ${item.price?.toFixed(2) || '0.00'}
            </Text>
          </View>
        </View>
        
        {/* Description */}
        {item.description && (
          <Text style={[styles.itemDescription, { color: COLORS.textSecondary }]} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        
        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
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

        {/* Footer with stock info and action button */}
        <View style={styles.itemFooter}>
          <View style={styles.itemMeta}>
            <View style={styles.metaRow}>
              <Text style={styles.metaIcon}>📦</Text>
              <Text style={styles.metaText}>
                {item.stock > 0 ? `Stock: ${item.stock}` : 'Agotado'}
              </Text>
            </View>
            {item.stock <= 5 && item.stock > 0 && (
              <View style={[styles.availabilityBadge, { backgroundColor: '#f59e0b' }]}>
                <Text style={[styles.availabilityText, { color: COLORS.background }]}>¡Pocos disponibles!</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.infoButton}
            onPress={() => {
              const nutritionInfo = item.nutritionalInfo 
                ? `\n\n📊 Información nutricional:\n• Calorías: ${item.nutritionalInfo.calories}\n• Proteínas: ${item.nutritionalInfo.protein}g\n• Carbohidratos: ${item.nutritionalInfo.carbs}g\n• Grasas: ${item.nutritionalInfo.fat}g`
                : '';
              
              AlertManager.alert(
                item.name, 
                `${item.description || 'Sin descripción'}${nutritionInfo}`
              );
            }}
            activeOpacity={0.6}
          >
            <Text style={styles.infoButtonText}>ℹ️</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: COLORS.background }]}>
        <Text style={[styles.loadingText, { color: COLORS.textSecondary }]}>Cargando menú...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: COLORS.background }]}>
        <Text style={[styles.errorText, { color: COLORS.error }]}>Error: {error}</Text>
        <Button
          title="Reintentar"
          onPress={() => {
            // TODO: Reload catalog
            ToastManager.info('Próximamente', 'Recargar catálogo estará disponible pronto');
          }}
        />
      </View>
    );
  }

  const data = selectedTab === 'plates' ? catalog?.plates || [] : catalog?.ingredients || [];

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      {/* Tab Selector */}
      <View style={[styles.tabContainer, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            selectedTab === 'plates' && [styles.activeTab, { backgroundColor: COLORS.primary }]
          ]}
          onPress={() => setSelectedTab('plates')}
        >
          <Text style={[
            styles.tabText,
            { color: selectedTab === 'plates' ? COLORS.background : COLORS.textSecondary },
            selectedTab === 'plates' && styles.activeTabText
          ]}>
            🍽️ Platillos
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tab,
            selectedTab === 'ingredients' && [styles.activeTab, { backgroundColor: COLORS.primary }]
          ]}
          onPress={() => setSelectedTab('ingredients')}
        >
          <Text style={[
            styles.tabText,
            { color: selectedTab === 'ingredients' ? COLORS.background : COLORS.textSecondary },
            selectedTab === 'ingredients' && styles.activeTabText
          ]}>
            🥬 Ingredientes
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <FlatList
        data={data}
        renderItem={selectedTab === 'plates' ? renderPlateItem : renderIngredientItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: COLORS.textSecondary }]}>
              No hay {selectedTab === 'plates' ? 'platillos' : 'ingredientes'} disponibles
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
  priceContainer: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    // Borde sutil en lugar de fondo
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    minWidth: 65,
    alignItems: 'center',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary, // Color primario para el precio
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