import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useCartStore } from '../../stores/cartStore';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/ui/Button';
import { ToastManager } from '../../utils/ToastManager';

interface CartItemProps {
  item: any;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
}

const CartItemComponent: React.FC<CartItemProps> = ({ 
  item, 
  onUpdateQuantity, 
  onRemove 
}) => {
  const updateQuantity = (change: number) => {
    const newQuantity = item.quantity + change;
    if (newQuantity <= 0) {
      Alert.alert(
        'Eliminar item',
        '¿Deseas eliminar este item del carrito?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: () => onRemove(item.id) }
        ]
      );
    } else {
      onUpdateQuantity(item.id, newQuantity);
    }
  };

  return (
    <View style={styles.cartItem}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemType}>
          {item.type === 'plate' ? '🍽️ Platillo' : '🎨 Personalizado'}
        </Text>
        <Text style={styles.itemPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
      </View>
      
      <View style={styles.quantityControls}>
        <TouchableOpacity 
          style={styles.quantityButton}
          onPress={() => updateQuantity(-1)}
        >
          <Text style={styles.quantityButtonText}>-</Text>
        </TouchableOpacity>
        
        <Text style={styles.quantity}>{item.quantity}</Text>
        
        <TouchableOpacity 
          style={styles.quantityButton}
          onPress={() => updateQuantity(1)}
        >
          <Text style={styles.quantityButtonText}>+</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity 
        style={styles.removeButton}
        onPress={() => onRemove(item.id)}
      >
        <Text style={styles.removeButtonText}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );
};

export const CartScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const navigation = useNavigation();
  const { cart, removeItem, clearCart, getTotalItems, getTotalPrice, setCart } = useCartStore();
  const { user } = useAuthStore();

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    // Find item and update it
    if (cart) {
      const updatedItems = cart.items.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      );
      
      const updatedCart = {
        ...cart,
        items: updatedItems,
        totalPrice: updatedItems.reduce((total, item) => total + (item.price * item.quantity), 0),
        updatedAt: new Date().toISOString()
      };
      
      useCartStore.getState().setCart(updatedCart);
    }
  };

  const handleRemoveItem = (itemId: string) => {
    const item = cart?.items.find(i => i.id === itemId);
    removeItem(itemId);
    if (item) {
      ToastManager.itemRemoved(item.name);
    }
  };

  const handleClearCart = () => {
    console.log('🧪 handleClearCart clicked!');
    setShowClearConfirm(true);
  };

  const confirmClearCart = () => {
    console.log('🧹 Clearing cart...');
    try {
      clearCart();
      console.log('✅ Cart cleared successfully');
      ToastManager.cartCleared();
      setShowClearConfirm(false);
    } catch (error) {
      console.error('❌ Error clearing cart:', error);
      ToastManager.error('Error', 'No se pudo vaciar el carrito');
      setShowClearConfirm(false);
    }
  };

  const cancelClearCart = () => {
    console.log('🚫 Clear cart cancelled');
    setShowClearConfirm(false);
  };

  const handleCheckout = () => {
    if (!cart || cart.items.length === 0) {
      ToastManager.warning('🛒 Carrito vacío', 'Agrega algunos items antes de continuar');
      return;
    }

    if (!user) {
      ToastManager.error('Por favor inicia sesión para realizar el pedido');
      return;
    }

    // Navigate to Checkout screen
    navigation.navigate('Checkout' as never);
  };

  const totalItems = getTotalItems();
  const totalPrice = getTotalPrice();

  if (!cart || cart.items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🛒</Text>
        <Text style={styles.emptyTitle}>Tu carrito está vacío</Text>
        <Text style={styles.emptySubtitle}>
          Explora nuestro menú y agrega algunos platillos deliciosos
        </Text>
        <Button
          title="Ver Menú"
          onPress={() => {
            // Navigate to Menu tab
            navigation.dispatch(CommonActions.navigate({
              name: 'MenuTab'
            }));
          }}
          style={styles.exploreButton}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🛒 Mi Carrito</Text>
        <Text style={styles.subtitle}>
          {totalItems} item{totalItems !== 1 ? 's' : ''} • {user?.name}
        </Text>
      </View>

      {/* Items List */}
      <FlatList
        data={cart.items}
        renderItem={({ item }) => (
          <CartItemComponent
            item={item}
            onUpdateQuantity={handleUpdateQuantity}
            onRemove={handleRemoveItem}
          />
        )}
        keyExtractor={(item) => item.id}
        style={styles.itemsList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />

      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal ({totalItems} items):</Text>
          <Text style={styles.summaryValue}>${totalPrice.toFixed(2)}</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Entrega:</Text>
          <Text style={styles.summaryValue}>Gratis</Text>
        </View>
        
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalValue}>${totalPrice.toFixed(2)}</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {showClearConfirm ? (
          <View style={styles.confirmContainer}>
            <TouchableOpacity 
              style={styles.cancelConfirmButton}
              onPress={cancelClearCart}
            >
              <Text style={styles.cancelConfirmText}>❌</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.clearConfirmButton}
              onPress={confirmClearCart}
            >
              <Text style={styles.clearConfirmText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Button
            title="Vaciar Carrito"
            onPress={handleClearCart}
            variant="outline"
            style={styles.clearButton}
          />
        )}
        
        <Button
          title="🚀 Ir a Checkout"
          onPress={handleCheckout}
          style={styles.checkoutButton}
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f9fafb',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  exploreButton: {
    minWidth: 200,
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
  },
  itemsList: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  cartItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  itemType: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  quantityButton: {
    backgroundColor: '#f3f4f6',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
  },
  quantity: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginHorizontal: 16,
    minWidth: 24,
    textAlign: 'center',
  },
  removeButton: {
    padding: 8,
  },
  removeButtonText: {
    fontSize: 18,
  },
  summary: {
    backgroundColor: 'white',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 16,
    color: '#1f2937',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  actions: {
    backgroundColor: 'white',
    padding: 20,
    paddingTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  clearButton: {
    flex: 0.3,
  },
  checkoutButton: {
    flex: 0.65,
  },
  confirmContainer: {
    flex: 0.3,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  cancelConfirmButton: {
    backgroundColor: '#f3f4f6',
    borderColor: '#9ca3af',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 0.45,
  },
  clearConfirmButton: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 0.45,
  },
  cancelConfirmText: {
    fontSize: 20,
    textAlign: 'center',
  },
  clearConfirmText: {
    fontSize: 20,
    textAlign: 'center',
  },
});