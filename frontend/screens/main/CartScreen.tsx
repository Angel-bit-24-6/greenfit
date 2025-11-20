import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useCartStore } from '../../stores/cartStore';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { Button } from '../../components/ui/Button';
import { ToastManager } from '../../utils/ToastManager';
import { AlertManager } from '../../utils/AlertManager';

interface CartItemProps {
  item: any;
  onUpdateQuantity: (itemId: string, quantity: number) => Promise<boolean>;
  onRemove: (itemId: string) => Promise<void>;
}

const CartItemComponent: React.FC<CartItemProps> = ({ 
  item, 
  onUpdateQuantity, 
  onRemove 
}) => {
  const { getThemeColors, currentTheme, colorMode } = useThemeStore();
  const COLORS = getThemeColors();
  const itemStyles = useMemo(() => createItemStyles(COLORS), [currentTheme.id, colorMode]);
  
  const updateQuantity = async (change: number) => {
    const newQuantity = item.quantity + change;
    if (newQuantity <= 0) {
      AlertManager.confirmDestructive(
        'Eliminar item',
        '¿Deseas eliminar este item del carrito?',
        async () => await onRemove(item.id)
      );
    } else {
      await onUpdateQuantity(item.id, newQuantity);
    }
  };

  return (
    <View style={[itemStyles.cartItem, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
      <View style={itemStyles.itemInfo}>
        <Text style={[itemStyles.itemName, { color: COLORS.text }]}>{item.name}</Text>
        {item.product?.producer && (
          <Text style={[itemStyles.producerName, { color: COLORS.textSecondary }]}>
            🧑‍🌾 {item.product.producer.businessName}
          </Text>
        )}
        <Text style={[itemStyles.itemWeight, { color: COLORS.primary }]}>
          {item.weightInKg.toFixed(2)} kg
        </Text>
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
        onPress={async () => await onRemove(item.id)}
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
  const { cart, removeItem, clearCart, getTotalItems, getTotalWeightInKg, updateQuantity, fetchCart } = useCartStore();
  const { subscription, getRemainingKg, getUsedKg } = useSubscriptionStore();
  const { user } = useAuthStore();
  const { getThemeColors, currentTheme, colorMode } = useThemeStore();
  const COLORS = getThemeColors();
  
  const styles = useMemo(() => createStyles(COLORS, colorMode), [currentTheme.id, colorMode]);

  useEffect(() => {
    fetchCart();
  }, []);

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      await removeItem(itemId);
      return false;
    }
    
    setLoading(true);
    try {
      const success = await updateQuantity(itemId, newQuantity);
      if (success) {
        await fetchCart(); // Reload cart to get updated weights
      }
      return success;
    } catch (error) {
      console.error('Error updating quantity:', error);
      ToastManager.error('Error', 'No se pudo actualizar la cantidad');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    const item = cart?.items.find(i => i.id === itemId);
    setLoading(true);
    try {
      await removeItem(itemId);
      await fetchCart(); // Reload cart
      if (item) {
        ToastManager.itemRemoved(item.name);
      }
    } catch (error) {
      console.error('Error removing item:', error);
      ToastManager.error('Error', 'No se pudo eliminar el item');
    } finally {
      setLoading(false);
    }
  };

  const handleClearCart = () => {
    setShowClearConfirm(true);
  };

  const confirmClearCart = async () => {
    setLoading(true);
    try {
      await clearCart();
      ToastManager.cartCleared();
      setShowClearConfirm(false);
    } catch (error) {
      console.error('Error clearing cart:', error);
      ToastManager.error('Error', 'No se pudo vaciar el carrito');
      setShowClearConfirm(false);
    } finally {
      setLoading(false);
    }
  };

  const cancelClearCart = () => {
    setShowClearConfirm(false);
  };

  const handleCheckout = () => {
    if (!cart || cart.items.length === 0) {
      ToastManager.warning('🛒 Carrito vacío', 'Agrega algunos productos antes de continuar');
      return;
    }

    if (!user) {
      ToastManager.error('Error', 'Por favor inicia sesión para realizar el pedido');
      return;
    }

    if (!subscription || !subscription.isActive) {
      AlertManager.alert(
        'Suscripción Requerida',
        'Necesitas un plan de suscripción activo para realizar pedidos.'
      );
      return;
    }

    const totalWeight = getTotalWeightInKg();
    const remainingKg = getRemainingKg();

    if (totalWeight > remainingKg) {
      AlertManager.alert(
        'Límite Excedido',
        `El peso total de tu carrito (${totalWeight.toFixed(2)} kg) excede tu límite disponible (${remainingKg.toFixed(2)} kg). Por favor, elimina algunos items.`
      );
      return;
    }

    // Navigate to Checkout screen
    navigation.navigate('Checkout' as never);
  };

  const totalItems = getTotalItems();
  const totalWeightInKg = getTotalWeightInKg();
  const remainingKg = getRemainingKg();
  const usedKg = getUsedKg();
  const limitInKg = subscription?.limitInKg || 0;
  const progressPercentage = limitInKg > 0 ? (usedKg / limitInKg) * 100 : 0;
  const canCheckout = totalWeightInKg <= remainingKg && subscription?.isActive;

  if (loading && (!cart || cart.items.length === 0)) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={[styles.loadingText, { color: COLORS.textSecondary }]}>Cargando carrito...</Text>
      </View>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: COLORS.background }]}>
        <Text style={styles.emptyIcon}>🛒</Text>
        <Text style={[styles.emptyTitle, { color: COLORS.text }]}>Tu carrito está vacío</Text>
        <Text style={[styles.emptySubtitle, { color: COLORS.textSecondary }]}>
          Explora nuestro catálogo y agrega algunos productos frescos
        </Text>
        <Button
          title="Ver Catálogo"
          onPress={() => {
            navigation.dispatch(CommonActions.navigate({
              name: 'CatalogTab'
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
          {totalItems} item{totalItems !== 1 ? 's' : ''} • {totalWeightInKg.toFixed(2)} kg
        </Text>
      </View>

      {/* Subscription Progress */}
      {subscription && (
        <View style={[styles.progressSection, { backgroundColor: COLORS.surface, borderBottomColor: COLORS.border }]}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: COLORS.text }]}>
              Plan {subscription.plan} • {limitInKg.toFixed(2)} kg/mes
            </Text>
            <Text style={[styles.progressRemaining, { color: COLORS.primary }]}>
              {remainingKg.toFixed(2)} kg restantes
            </Text>
          </View>
          <View style={[styles.progressBarContainer, { backgroundColor: COLORS.border }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(progressPercentage, 100)}%`,
                  backgroundColor: progressPercentage > 80 ? COLORS.error : COLORS.primary,
                },
              ]}
            />
          </View>
          <View style={styles.progressTextContainer}>
            <Text style={[styles.progressText, { color: COLORS.textSecondary }]}>
              {usedKg.toFixed(2)} kg usados
            </Text>
            <Text style={[styles.progressText, { color: COLORS.textSecondary }]}>
              {remainingKg.toFixed(2)} kg disponibles
            </Text>
          </View>
        </View>
      )}

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
        refreshing={loading}
        onRefresh={fetchCart}
      />

      {/* Summary */}
      <View style={[styles.summary, { backgroundColor: COLORS.surface, borderTopColor: COLORS.border }]}>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: COLORS.textSecondary }]}>Peso total ({totalItems} items):</Text>
          <Text style={[styles.summaryValue, { color: COLORS.text }]}>
            {totalWeightInKg.toFixed(2)} kg
          </Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: COLORS.textSecondary }]}>Límite disponible:</Text>
          <Text style={[styles.summaryValue, { color: remainingKg > 0 ? COLORS.primary : COLORS.error }]}>
            {remainingKg.toFixed(2)} kg
          </Text>
        </View>
        
        {!canCheckout && (
          <View style={[styles.warningRow, { backgroundColor: COLORS.error + '20', borderColor: COLORS.error }]}>
            <Text style={[styles.warningText, { color: COLORS.error }]}>
              ⚠️ El peso total excede tu límite disponible
            </Text>
          </View>
        )}
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
          title={canCheckout ? "🚀 Ir a Checkout" : "⚠️ Límite Excedido"}
          onPress={handleCheckout}
          style={[styles.checkoutButton, !canCheckout && styles.checkoutButtonDisabled]}
          size="large"
          disabled={!canCheckout}
        />
      </View>
    </View>
  );
};

const createStyles = (COLORS: any, colorMode: 'dark' | 'light') => StyleSheet.create({
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
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    color: COLORS.textSecondary,
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
    backgroundColor: COLORS.background,
    padding: 20,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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
  progressSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressRemaining: {
    fontSize: 16,
    fontWeight: '700',
  },
  progressBarContainer: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressTextContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600',
  },
  itemsList: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  summary: {
    backgroundColor: COLORS.background,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
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
  warningRow: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  warningText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  actions: {
    backgroundColor: COLORS.background,
    padding: 20,
    paddingTop: 16,
    flexDirection: 'row',
    gap: 12,
  },
  clearButton: {
    flex: 0.3,
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
  },
  checkoutButton: {
    flex: 0.65,
    backgroundColor: COLORS.primary,
  },
  checkoutButtonDisabled: {
    backgroundColor: COLORS.surfaceElevated,
    opacity: 0.5,
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
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 0.45,
  },
  clearConfirmButton: {
    backgroundColor: COLORS.error,
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
  cartItem: {
    backgroundColor: COLORS.background,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  producerName: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontWeight: '500',
  },
  itemWeight: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.primary,
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
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
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
