import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useCartStore } from '../../stores/cartStore';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { Button } from '../../components/ui/Button';
import { ToastManager } from '../../utils/ToastManager';
import { AlertManager } from '../../utils/AlertManager';

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
  const { getThemeColors, currentTheme, colorMode } = useThemeStore();
  const COLORS = getThemeColors();
  const itemStyles = useMemo(() => createItemStyles(COLORS), [currentTheme.id, colorMode]);
  
  const updateQuantity = (change: number) => {
    const newQuantity = item.quantity + change;
    if (newQuantity <= 0) {
      AlertManager.confirmDestructive(
        'Eliminar item',
        '¿Deseas eliminar este item del carrito?',
        () => onRemove(item.id)
      );
    } else {
      onUpdateQuantity(item.id, newQuantity);
    }
  };

  return (
    <View style={[itemStyles.cartItem, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
      <View style={itemStyles.itemInfo}>
        <Text style={[itemStyles.itemName, { color: COLORS.text }]}>{item.name}</Text>
        <Text style={[itemStyles.itemType, { color: COLORS.textSecondary }]}>
          {item.type === 'plate' ? '🍽️ Platillo' : '🎨 Personalizado'}
        </Text>
        <Text style={[itemStyles.itemPrice, { color: COLORS.primary }]}>${(item.price * item.quantity).toFixed(2)}</Text>
      </View>
      
      <View style={itemStyles.quantityControls}>
        <TouchableOpacity 
          style={[itemStyles.quantityButton, { backgroundColor: COLORS.surfaceElevated, borderColor: COLORS.border }]}
          onPress={() => updateQuantity(-1)}
        >
          <Text style={[itemStyles.quantityButtonText, { color: COLORS.text }]}>-</Text>
        </TouchableOpacity>
        
        <Text style={[itemStyles.quantity, { color: COLORS.text }]}>{item.quantity}</Text>
        
        <TouchableOpacity 
          style={[itemStyles.quantityButton, { backgroundColor: COLORS.surfaceElevated, borderColor: COLORS.border }]}
          onPress={() => updateQuantity(1)}
        >
          <Text style={[itemStyles.quantityButtonText, { color: COLORS.text }]}>+</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity 
  style={itemStyles.removeButton}
  onPress={() => onRemove(item.id)}
>
  <Text style={itemStyles.removeButtonText}>🗑️</Text>
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
  const { getThemeColors, currentTheme, colorMode } = useThemeStore();
  const COLORS = getThemeColors();
  
  // Create dynamic styles based on current theme and color mode
  const styles = useMemo(() => createStyles(COLORS), [currentTheme.id, colorMode]);

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
      <View style={[styles.emptyContainer, { backgroundColor: COLORS.background }]}>
        <Text style={styles.emptyIcon}>🛒</Text>
        <Text style={[styles.emptyTitle, { color: COLORS.text }]}>Tu carrito está vacío</Text>
        <Text style={[styles.emptySubtitle, { color: COLORS.textSecondary }]}>
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
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: COLORS.surface, borderBottomColor: COLORS.border }]}>
        <Text style={[styles.title, { color: COLORS.text }]}>🛒 Mi Carrito</Text>
        <Text style={[styles.subtitle, { color: COLORS.textSecondary }]}>
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
      <View style={[styles.summary, { backgroundColor: COLORS.surface, borderTopColor: COLORS.border }]}>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: COLORS.textSecondary }]}>Subtotal ({totalItems} items):</Text>
          <Text style={[styles.summaryValue, { color: COLORS.text }]}>${totalPrice.toFixed(2)}</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: COLORS.textSecondary }]}>Entrega:</Text>
          <Text style={[styles.summaryValue, { color: COLORS.text }]}>Gratis</Text>
        </View>
        
        <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: COLORS.border }]}>
          <Text style={[styles.totalLabel, { color: COLORS.text }]}>Total:</Text>
          <Text style={[styles.totalValue, { color: COLORS.primary }]}>${totalPrice.toFixed(2)}</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={[styles.actions, { backgroundColor: COLORS.surface, borderTopColor: COLORS.border }]}>
        {showClearConfirm ? (
          <View style={styles.confirmContainer}>
            <TouchableOpacity 
              style={[styles.cancelConfirmButton, { backgroundColor: COLORS.surfaceElevated, borderColor: COLORS.border }]}
              onPress={cancelClearCart}
            >
              <Text style={styles.cancelConfirmText}>❌</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.clearConfirmButton, { backgroundColor: COLORS.error }]}
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

// ... (el resto del código anterior se mantiene igual)

const createStyles = (COLORS: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: COLORS.background,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  emptySubtitle: {
    fontSize: 17,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    fontWeight: '400',
  },
  exploreButton: {
    minWidth: 200,
  },
  header: {
    backgroundColor: COLORS.background, // Fondo de pantalla
    padding: 20,
    paddingTop: 16,
    borderBottomWidth: 1, // Línea sutil en la parte inferior
    borderBottomColor: COLORS.border,
    // Eliminamos todas las sombras
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 6,
    fontWeight: '400',
  },
  itemsList: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  
  // --- RESUMEN MODIFICADO ---
  summary: {
    backgroundColor: COLORS.background, // Fondo de pantalla
    padding: 24,
    borderTopWidth: 1, // Línea sutil en la parte superior
    borderTopColor: COLORS.border,
    // Eliminamos sombras
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '600',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 16,
    marginTop: 8,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary, // Color primario para el total
    letterSpacing: -0.3,
  },
  
  // --- ACCIONES MODIFICADAS ---
  actions: {
    backgroundColor: COLORS.background, // Fondo de pantalla
    padding: 20,
    paddingTop: 16,
    // Eliminamos sombras
  },
  clearButton: {
    flex: 0.3,
    borderWidth: 1,
    borderColor: COLORS.textSecondary, // Borde sutil
  },
  checkoutButton: {
    flex: 0.65,
    backgroundColor: COLORS.primary, // Botón sólido con color primario
  },
  confirmContainer: {
    flex: 0.3,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    gap: 12,
  },
  cancelConfirmButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
    borderRadius: 16, // Un poco de redondeo para los botones de acción
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 0.45,
  },
  clearConfirmButton: {
    backgroundColor: COLORS.error, // Rojo para acción destructiva
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 0.45,
  },
  cancelConfirmText: {
    fontSize: 20,
    textAlign: 'center',
    color: COLORS.textSecondary,
  },
  clearConfirmText: {
    fontSize: 20,
    textAlign: 'center',
    color: COLORS.background,
  },
});

const createItemStyles = (COLORS: any) => StyleSheet.create({
  // --- TARJETA DE ITEM MODIFICADA ---
  cartItem: {
    backgroundColor: COLORS.background, // Fondo de pantalla
    padding: 16, // Menos padding
    // Eliminamos borderRadius y sombras
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1, // Línea sutil para separar items
    borderBottomColor: COLORS.border,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4, // Menos espacio
    letterSpacing: -0.3,
  },
  itemType: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontWeight: '500',
  },
  itemPrice: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.primary, // Color primario
    letterSpacing: -0.3,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  quantityButton: {
    width: 34,
    height: 34,
    // Borde sutil en lugar de fondo
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 17, // Redondeo total para un look moderno
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary, // Color primario
  },
  quantity: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    marginHorizontal: 16,
    minWidth: 24,
    textAlign: 'center',
  },
  removeButton: {
    padding: 10,
  },
  removeButtonText: {
    fontSize: 18,
    color: COLORS.textSecondary,
  },
});