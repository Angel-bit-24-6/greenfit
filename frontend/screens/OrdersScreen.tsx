import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useOrderStore, Order } from '../stores/orderStore';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore, ColorMode } from '../stores/themeStore';
import { ToastManager } from '../utils/ToastManager';
import { AlertManager } from '../utils/AlertManager';

interface OrdersScreenProps {
  navigation: any;
}

const OrdersScreen: React.FC<OrdersScreenProps> = ({ navigation }) => {
  const { 
    userOrders, 
    isLoadingOrders, 
    error,
    getUserOrders,
    clearError 
  } = useOrderStore();
  const { user } = useAuthStore();
  const { getThemeColors, currentTheme, colorMode } = useThemeStore();
  const COLORS = getThemeColors();
  const styles = useMemo(() => createStyles(COLORS, colorMode), [currentTheme.id, colorMode]);

  const [refreshing, setRefreshing] = useState(false);
  const [useDemoData, setUseDemoData] = useState(false);

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  useEffect(() => {
    if (error) {
      // Si hay error, usar datos de demostración
      setUseDemoData(true);
      clearError();
    }
  }, [error]);

  const loadOrders = async () => {
    if (!user) return;
    try {
      setUseDemoData(false);
      await getUserOrders(user.id);
      // Si no hay órdenes después de cargar, usar datos demo
      if (userOrders.length === 0 && !isLoadingOrders) {
        setUseDemoData(true);
      }
    } catch (err) {
      setUseDemoData(true);
    }
  };

  // Función para obtener datos de demostración
  const getDemoOrders = (): Order[] => {
    const now = new Date();
    return [
      {
        id: 'demo-order-1',
        items: [
          { id: 'demo-item-1-1', type: 'plate', name: 'Ensalada Mediterránea', quantity: 2, price: 12.99 },
          { id: 'demo-item-1-2', type: 'custom', name: 'Smoothie Verde', quantity: 1, price: 8.50 },
        ],
        totalPrice: 34.48,
        status: 'delivered',
        paymentStatus: 'completed',
        paymentMethod: 'card',
        paymentId: 'demo-payment-1',
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Entregado en la puerta principal',
      },
      {
        id: 'demo-order-2',
        items: [
          { id: 'demo-item-2-1', type: 'plate', name: 'Bowl de Quinoa', quantity: 1, price: 14.99 },
          { id: 'demo-item-2-2', type: 'custom', name: 'Jugo Detox', quantity: 2, price: 6.50 },
        ],
        totalPrice: 27.99,
        status: 'preparing',
        paymentStatus: 'completed',
        paymentMethod: 'paypal',
        paymentId: 'demo-payment-2',
        createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Sin cebolla, por favor',
      },
      {
        id: 'demo-order-3',
        items: [
          { id: 'demo-item-3-1', type: 'plate', name: 'Wrap Vegano', quantity: 3, price: 10.99 },
        ],
        totalPrice: 32.97,
        status: 'confirmed',
        paymentStatus: 'completed',
        paymentMethod: 'card',
        paymentId: 'demo-payment-3',
        createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      },
    ];
  };

  const displayOrders = useDemoData ? getDemoOrders() : userOrders;

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#f59e0b';
      case 'confirmed':
        return '#3b82f6';
      case 'preparing':
        return '#8b5cf6';
      case 'ready':
        return '#10b981';
      case 'delivered':
        return '#16a34a';
      case 'cancelled':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#16a34a';
      case 'pending':
        return '#f59e0b';
      case 'failed':
        return '#ef4444';
      case 'refunded':
        return '#8b5cf6';
      default:
        return '#6b7280';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderOrderItem = React.useCallback((order: Order) => (
    <TouchableOpacity
      key={order.id}
      style={[styles.orderCard, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}
      onPress={() => {
        if (order.id.startsWith('demo-')) {
          AlertManager.alert(
            'Pedido de Demostración',
            `Este es un pedido de demostración.\n\nTotal: $${order.totalPrice.toFixed(2)}\nEstado: ${order.status}\nPago: ${order.paymentStatus}`
          );
        } else {
          (navigation as any).navigate('OrderDetail', { orderId: order.id });
        }
      }}
      activeOpacity={0.7}
    >
      <View style={styles.orderHeader}>
        <View>
          <Text style={[styles.orderId, { color: COLORS.text }]}>
            Pedido #{order.id.slice(-8)}
          </Text>
          <Text style={[styles.orderDate, { color: COLORS.textSecondary }]}>
            {formatDate(order.createdAt)}
          </Text>
        </View>
        <Text style={[styles.orderTotal, { color: COLORS.primary }]}>
          ${order.totalPrice.toFixed(2)}
        </Text>
      </View>

      <View style={styles.orderStatus}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
          <Text style={styles.statusText}>{order.status.toUpperCase()}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getPaymentStatusColor(order.paymentStatus) }]}>
          <Text style={styles.statusText}>
            {order.paymentStatus === 'completed' ? 'PAID' : order.paymentStatus.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.orderItems}>
        <Text style={[styles.itemsTitle, { color: COLORS.text }]}>Productos:</Text>
        {order.items.slice(0, 2).map((item: any, index: number) => (
          <Text key={`${order.id}-${index}`} style={[styles.itemText, { color: COLORS.textSecondary }]}>
            • {item.name} (x{item.quantity})
          </Text>
        ))}
        {order.items.length > 2 && (
          <Text style={[styles.moreItems, { color: COLORS.textSecondary }]}>
            +{order.items.length - 2} productos más
          </Text>
        )}
      </View>

      {order.notes && (
        <View style={[styles.notesSection, { borderTopColor: COLORS.border }]}>
          <Text style={[styles.notesTitle, { color: COLORS.text }]}>Notas:</Text>
          <Text style={[styles.notesText, { color: COLORS.textSecondary }]}>{order.notes}</Text>
        </View>
      )}

      {order.id.startsWith('demo-') && (
        <View style={[styles.demoBadge, { backgroundColor: COLORS.primary + '20' }]}>
          <Text style={[styles.demoBadgeText, { color: COLORS.primary }]}>📋 Demostración</Text>
        </View>
      )}
    </TouchableOpacity>
  ), [navigation]);

  if (!user) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: COLORS.background }]}>
        <Text style={[styles.emptyText, { color: COLORS.text }]}>
          Por favor inicia sesión para ver tus pedidos
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: COLORS.primary }]}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.buttonText}>Iniciar Sesión</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isLoadingOrders && displayOrders.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={[styles.loadingText, { color: COLORS.textSecondary }]}>
          Cargando tus pedidos...
        </Text>
      </View>
    );
  }

  if (displayOrders.length === 0 && !isLoadingOrders) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: COLORS.background }]}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        <View style={styles.centerContainer}>
          <Text style={[styles.emptyTitle, { color: COLORS.text }]}>
            No hay pedidos aún
          </Text>
          <Text style={[styles.emptyText, { color: COLORS.textSecondary }]}>
            Comienza a comprar para ver tus pedidos aquí
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: COLORS.primary }]}
            onPress={() => navigation.navigate('Main', { screen: 'MenuTab' })}
          >
            <Text style={styles.buttonText}>Explorar Menú</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      <Text style={[styles.title, { color: COLORS.text }]}>Mis Pedidos</Text>
      {useDemoData && (
        <View style={[styles.demoNotice, { backgroundColor: COLORS.primary + '15', borderColor: COLORS.primary + '40' }]}>
          <Text style={[styles.demoNoticeText, { color: COLORS.primary }]}>
            📋 Mostrando datos de demostración
          </Text>
        </View>
      )}
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {displayOrders.map(renderOrderItem)}
        
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

const createStyles = (COLORS: any, colorMode: ColorMode) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  demoNotice: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  demoNoticeText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  orderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: colorMode === 'dark' ? 0.3 : 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderId: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  orderDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  orderTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  orderStatus: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  orderItems: {
    marginBottom: 8,
  },
  itemsTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 4,
  },
  itemText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  moreItems: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginLeft: 8,
    marginTop: 2,
  },
  notesSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 2,
  },
  notesText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  demoBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  demoBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
  },
  bottomSpacing: {
    height: 32,
  },
});

export default OrdersScreen;