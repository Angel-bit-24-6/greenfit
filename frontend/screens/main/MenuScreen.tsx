import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useCatalogStore } from '../../stores/catalogStore';
import { useCartStore } from '../../stores/cartStore';
import { Button } from '../../components/ui/Button';
import { ToastManager } from '../../utils/ToastManager';

export const MenuScreen: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<'plates' | 'ingredients'>('plates');
  const { catalog, loading, error } = useCatalogStore();
  const { addItem } = useCartStore();

  const handleAddToCart = async (item: any) => {
    try {
      if (selectedTab === 'plates') {
        // Validate item availability
        if (!item.available) {
          ToastManager.noStock(item.name);
          return;
        }

        // Add to cart with validation
        const success = await addItem({
          type: 'plate',
          plateId: item.id,
          quantity: 1,
          price: item.price,
          name: item.name,
          image: item.image || undefined
        });

        if (success) {
          // Show success toast
          ToastManager.addedToCart(item.name, item.price);
        } else {
          // addItem failed - error is already set in store
          ToastManager.error('Item could not be added to cart');
        }
      } else {
        // For ingredients - show info about custom plates
        Alert.alert(
          'Crear platillo personalizado',
          'Los ingredientes se pueden usar en platillos personalizados.\n\n¿Te gustaría crear uno?',
          [
            { text: 'Más tarde', style: 'cancel' },
            { 
              text: 'Crear platillo',
              onPress: () => Alert.alert('Info', 'Custom Plate Builder - próximamente')
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', 'No se pudo agregar al carrito. Inténtalo de nuevo.');
    }
  };

  const renderPlateItem = ({ item }: { item: any }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemPrice}>${item.price?.toFixed(2) || '0.00'}</Text>
      </View>
      
      <Text style={styles.itemDescription}>{item.description}</Text>
      
      <View style={styles.itemTags}>
        {item.tags?.map((tag: string) => (
          <View key={tag} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>

      <View style={styles.itemFooter}>
        <View style={styles.itemMeta}>
          <Text style={styles.prepTime}>
            ⏱️ {item.preparationTime || 10} min
          </Text>
          {!item.available && (
            <Text style={styles.unavailable}>No disponible</Text>
          )}
        </View>
        <Button
          title={item.available ? 'Agregar' : 'Agotado'}
          onPress={() => handleAddToCart(item)}
          size="small"
          disabled={!item.available}
          variant={item.available ? 'primary' : 'outline'}
        />
      </View>
    </View>
  );

  const renderIngredientItem = ({ item }: { item: any }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemPrice}>${item.price?.toFixed(2) || '0.00'}</Text>
      </View>
      
      <Text style={styles.itemDescription}>{item.description}</Text>
      
      <View style={styles.itemTags}>
        {item.tags?.map((tag: string) => (
          <View key={tag} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>

      <View style={styles.itemFooter}>
        <View style={styles.itemMeta}>
          <Text style={styles.stock}>
            📦 {item.stock > 0 ? `Stock: ${item.stock}` : 'Agotado'}
          </Text>
          {item.stock <= 5 && item.stock > 0 && (
            <Text style={styles.lowStock}>¡Pocos disponibles!</Text>
          )}
        </View>
        <Button
          title="Ver info"
          onPress={() => {
            const nutritionInfo = item.nutritionalInfo 
              ? `\n\n📊 Información nutricional:\n• Calorías: ${item.nutritionalInfo.calories}\n• Proteínas: ${item.nutritionalInfo.protein}g\n• Carbohidratos: ${item.nutritionalInfo.carbs}g\n• Grasas: ${item.nutritionalInfo.fat}g`
              : '';
            
            Alert.alert(
              item.name, 
              `${item.description || 'Sin descripción'}${nutritionInfo}`
            );
          }}
          variant="outline"
          size="small"
        />
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Cargando menú...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <Button
          title="Reintentar"
          onPress={() => {
            // TODO: Reload catalog
            Alert.alert('Info', 'Recargar catálogo - próximamente');
          }}
        />
      </View>
    );
  }

  const data = selectedTab === 'plates' ? catalog?.plates || [] : catalog?.ingredients || [];

  return (
    <View style={styles.container}>
      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'plates' && styles.activeTab]}
          onPress={() => setSelectedTab('plates')}
        >
          <Text style={[styles.tabText, selectedTab === 'plates' && styles.activeTabText]}>
            🍽️ Platillos
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'ingredients' && styles.activeTab]}
          onPress={() => setSelectedTab('ingredients')}
        >
          <Text style={[styles.tabText, selectedTab === 'ingredients' && styles.activeTabText]}>
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
            <Text style={styles.emptyText}>
              No hay {selectedTab === 'plates' ? 'platillos' : 'ingredientes'} disponibles
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#22c55e',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: 'white',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  itemCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
    marginRight: 8,
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  itemDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  itemTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
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
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemMeta: {
    flex: 1,
  },
  prepTime: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  unavailable: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '600',
  },
  stock: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  lowStock: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '600',
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