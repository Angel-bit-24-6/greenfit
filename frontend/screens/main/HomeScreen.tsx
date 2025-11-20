import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Animated,
  TouchableOpacity,
  Platform,
  Dimensions,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useAuthStore } from '../../stores/authStore';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { useProductStore } from '../../stores/productStore';
import { useProducerStore } from '../../stores/producerStore';
import { useCartStore } from '../../stores/cartStore';
import { useOrderStore, type Order } from '../../stores/orderStore_nutrifresco';
import { useThemeStore } from '../../stores/themeStore';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { AlertManager } from '../../utils/AlertManager';
import { ToastManager } from '../../utils/ToastManager';

const { width } = Dimensions.get('window');

// Helper function to get plan display name
const getPlanDisplayName = (plan: string): string => {
  switch (plan) {
    case 'BASIC':
      return 'Básico';
    case 'STANDARD':
      return 'Estándar';
    case 'PREMIUM':
      return 'Premium';
    default:
      return plan;
  }
};

// Helper function to get plan emoji
const getPlanEmoji = (plan: string): string => {
  switch (plan) {
    case 'BASIC':
      return '🥬';
    case 'STANDARD':
      return '🌱';
    case 'PREMIUM':
      return '🌟';
    default:
      return '📦';
  }
};

export const HomeScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { user, logout } = useAuthStore();
  const { subscription, fetchCurrentSubscription, getRemainingKg, getUsedKg, loading: subscriptionLoading } = useSubscriptionStore();
  const { products, fetchProducts, loading: productsLoading, error: productsError } = useProductStore();
  const { producers, fetchProducers, loading: producersLoading, error: producersError } = useProducerStore();
  const { orders, fetchOrders, loading: ordersLoading } = useOrderStore();
  const { getTotalItems, getTotalWeightInKg } = useCartStore();
  const { getThemeColors, currentTheme, colorMode } = useThemeStore();
  const COLORS = getThemeColors();

  const totalCartItems = getTotalItems();
  const totalWeightInCart = getTotalWeightInKg();
  const remainingKg = getRemainingKg();
  const usedKg = getUsedKg();
  const limitInKg = subscription?.limitInKg || 0;
  const progressPercentage = limitInKg > 0 ? (usedKg / limitInKg) * 100 : 0;

  const styles = useMemo(() => createStyles(COLORS, colorMode), [currentTheme.id, colorMode]);

  // Animations
  const fadeAnim = useRef(new Animated.Value(1)).current; // Start at 1 to show content immediately
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Load data on mount
    fetchCurrentSubscription();
    fetchProducts();
    fetchProducers();
    fetchOrders();

    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: progressPercentage,
        duration: 1000,
        delay: 300,
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    // Update progress animation when subscription changes
    Animated.timing(progressAnim, {
      toValue: progressPercentage,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [progressPercentage]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchCurrentSubscription(),
      fetchProducts(),
      fetchProducers(),
      fetchOrders(),
    ]);
    setRefreshing(false);
  };

  // Demo orders data (fallback if no orders)
  const getDemoOrders = (): Order[] => {
    const now = new Date();
    return [
      {
        id: 'demo-1',
        userId: user?.id || '',
        totalWeightInKg: 3.5,
        status: 'delivered',
        deliveryAddress: 'Av. Insurgentes Sur 123, Del Valle',
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        items: [
          {
            id: 'demo-item-1',
            orderId: 'demo-1',
            productId: 'demo-prod-1',
            quantity: 2,
            weightInKg: 2.0,
            name: 'Tomates Rojos',
            producerName: 'Granja Orgánica',
          },
          {
            id: 'demo-item-2',
            orderId: 'demo-1',
            productId: 'demo-prod-2',
            quantity: 1,
            weightInKg: 1.5,
            name: 'Lechuga Fresca',
            producerName: 'Granja Orgánica',
          },
        ],
      },
      {
        id: 'demo-2',
        userId: user?.id || '',
        totalWeightInKg: 5.2,
        status: 'ready',
        deliveryAddress: 'Av. Insurgentes Sur 123, Del Valle',
        createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        items: [
          {
            id: 'demo-item-3',
            orderId: 'demo-2',
            productId: 'demo-prod-3',
            quantity: 3,
            weightInKg: 3.0,
            name: 'Zanahorias',
            producerName: 'Huerto Local',
          },
          {
            id: 'demo-item-4',
            orderId: 'demo-2',
            productId: 'demo-prod-4',
            quantity: 2,
            weightInKg: 2.2,
            name: 'Cebollas',
            producerName: 'Huerto Local',
          },
        ],
      },
      {
        id: 'demo-3',
        userId: user?.id || '',
        totalWeightInKg: 2.8,
        status: 'preparing',
        deliveryAddress: 'Av. Insurgentes Sur 123, Del Valle',
        createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
        items: [
          {
            id: 'demo-item-5',
            orderId: 'demo-3',
            productId: 'demo-prod-5',
            quantity: 1,
            weightInKg: 2.8,
            name: 'Huevos de Campo',
            producerName: 'Avícola San José',
          },
        ],
      },
    ];
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'confirmed':
        return 'Confirmado';
      case 'preparing':
        return 'En preparación';
      case 'ready':
        return 'En camino';
      case 'delivered':
        return 'Entregado';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'delivered':
        return COLORS.primary;
      case 'ready':
        return '#3b82f6';
      case 'preparing':
        return '#f59e0b';
      case 'confirmed':
        return '#10b981';
      case 'pending':
        return COLORS.textSecondary;
      case 'cancelled':
        return COLORS.error;
      default:
        return COLORS.textSecondary;
    }
  };

  const getStatusEmoji = (status: string): string => {
    switch (status) {
      case 'delivered':
        return '✅';
      case 'ready':
        return '🚚';
      case 'preparing':
        return '👨‍🍳';
      case 'confirmed':
        return '📦';
      case 'pending':
        return '⏳';
      case 'cancelled':
        return '❌';
      default:
        return '📋';
    }
  };

  const recentOrders = orders.length > 0 ? orders.slice(0, 3) : getDemoOrders();

  const handleLogout = () => {
    AlertManager.confirmDestructive(
      'Cerrar sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      logout
    );
  };

  const navigateToCatalog = () => {
    (navigation as any).navigate('Main', { screen: 'CatalogTab' });
  };

  const navigateToCart = () => {
    (navigation as any).navigate('Main', { screen: 'CartTab' });
  };

  const navigateToProducerList = () => {
    navigation.navigate('ProducerList' as never);
  };

  const handleAddToCart = async (product: any) => {
    try {
      if (!product.available || product.stock <= 0) {
        ToastManager.noStock(product.name);
        return;
      }

      if (!subscription) {
        AlertManager.alert('Suscripción Requerida', 'Necesitas un plan de suscripción activo para agregar productos al carrito.');
        return;
      }

      const { canAddProduct } = useSubscriptionStore.getState();
      if (!canAddProduct(product.weightInKg)) {
        AlertManager.alert(
          'Límite de Peso Excedido',
          `No puedes agregar ${product.name} porque excedería tu límite de ${subscription.limitInKg.toFixed(2)} kg. Te quedan ${getRemainingKg().toFixed(2)} kg.`
        );
        return;
      }

      const { addItem } = useCartStore.getState();
      const success = await addItem(product, 1);

      if (success) {
        ToastManager.addedToCart(product.name, product.weightInKg);
      } else {
        ToastManager.error('Error', 'No se pudo agregar al carrito');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      ToastManager.error('Error', 'Ocurrió un error inesperado');
    }
  };

  // Ensure we have colors before rendering
  if (!COLORS || !COLORS.background) {
    return (
      <View style={{ flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' }}>
        <Text>Cargando...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Header Section */}
        <Animated.View
          style={[
            styles.heroSection,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroText}>
              <Text style={styles.heroGreeting}>
                Hola, {user?.name?.split(' ')[0] || 'Usuario'} 👋
              </Text>
              <Text style={styles.heroSubtitle}>
                Tu marketplace local de productos frescos
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleLogout}
              style={styles.logoutButton}
              activeOpacity={0.7}
            >
              <Text style={styles.logoutIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Subscription Summary */}
        <Animated.View
          style={[
            styles.section,
            { opacity: fadeAnim },
          ]}
        >
          <Text style={styles.sectionTitle}>Tu Suscripción</Text>
          {subscriptionLoading ? (
            <Text style={styles.loadingText}>Cargando suscripción...</Text>
          ) : subscription ? (
            <TouchableOpacity
              style={styles.subscriptionCard}
              onPress={() => navigation.navigate('SubscriptionSettings' as never)}
              activeOpacity={0.8}
            >
              <View style={styles.subscriptionHeader}>
                <View style={styles.subscriptionPlanContainer}>
                  <Text style={styles.subscriptionPlanEmoji}>
                    {getPlanEmoji(subscription.plan)}
                  </Text>
                  <View>
                    <Text style={styles.subscriptionPlan}>
                      Plan {getPlanDisplayName(subscription.plan)}
                    </Text>
                    <Text style={styles.subscriptionLimit}>
                      {limitInKg.toFixed(0)} kg/mes
                    </Text>
                  </View>
                </View>
                <Text style={styles.subscriptionRenewal}>
                  Renovación: {new Date(subscription.renewalDate).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </Text>
              </View>
              <View style={styles.progressBarContainer}>
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    { width: progressAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                    }) },
                  ]}
                />
              </View>
              <Text style={styles.subscriptionUsage}>
                {usedKg.toFixed(2)} kg usados de {limitInKg.toFixed(2)} kg
              </Text>
              <Text style={styles.subscriptionRemaining}>
                {remainingKg.toFixed(2)} kg restantes este mes
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>⚠️</Text>
              <Text style={styles.emptyText}>No tienes una suscripción activa.</Text>
              <TouchableOpacity onPress={() => navigation.navigate('SubscriptionSettings' as never)}>
                <Text style={styles.actionLink}>Elige un plan</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        {/* Recent Orders */}
        <Animated.View
          style={[
            styles.section,
            { opacity: fadeAnim },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pedidos Recientes</Text>
            {orders.length > 0 && (
              <TouchableOpacity onPress={() => navigation.navigate('Orders' as never)}>
                <Text style={styles.seeAllText}>Ver todos</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {ordersLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { color: COLORS.textSecondary }]}>
                Cargando pedidos...
              </Text>
            </View>
          ) : recentOrders.length > 0 ? (
            <View style={styles.ordersList}>
              {recentOrders.map((order) => (
                <TouchableOpacity
                  key={order.id}
                  style={[styles.orderCard, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}
                  onPress={() => {
                    if (order.id.startsWith('demo-')) {
                      // Demo order - show alert
                      AlertManager.alert(
                        'Pedido de Demostración',
                        `Este es un pedido de demostración.\n\nPeso: ${order.totalWeightInKg.toFixed(2)} kg\nEstado: ${getStatusLabel(order.status)}`
                      );
                    } else {
                      (navigation as any).navigate('OrderDetail', { orderId: order.id });
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.orderCardHeader}>
                    <View style={styles.orderCardLeft}>
                      <View style={[styles.orderStatusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                        <Text style={styles.orderStatusEmoji}>{getStatusEmoji(order.status)}</Text>
                        <Text style={[styles.orderStatusText, { color: getStatusColor(order.status) }]}>
                          {getStatusLabel(order.status)}
                        </Text>
                      </View>
                      <Text style={[styles.orderDate, { color: COLORS.textSecondary }]}>
                        {new Date(order.createdAt).toLocaleDateString('es-MX', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </Text>
                    </View>
                    <View style={styles.orderCardRight}>
                      <Text style={[styles.orderWeight, { color: COLORS.primary }]}>
                        {order.totalWeightInKg.toFixed(2)} kg
                      </Text>
                      {order.id.startsWith('demo-') && (
                        <Text style={[styles.demoBadge, { color: COLORS.textSecondary }]}>
                          Demo
                        </Text>
                      )}
                    </View>
                  </View>
                  
                  <View style={styles.orderItemsPreview}>
                    {order.items.slice(0, 2).map((item) => (
                      <View key={item.id} style={styles.orderItemPreview}>
                        <Text style={[styles.orderItemName, { color: COLORS.text }]}>
                          {item.quantity}x {item.name}
                        </Text>
                        {item.producerName && (
                          <Text style={[styles.orderItemProducer, { color: COLORS.textSecondary }]}>
                            🧑‍🌾 {item.producerName}
                          </Text>
                        )}
                      </View>
                    ))}
                    {order.items.length > 2 && (
                      <Text style={[styles.orderMoreItems, { color: COLORS.textSecondary }]}>
                        +{order.items.length - 2} producto{order.items.length - 2 > 1 ? 's' : ''} más
                      </Text>
                    )}
                  </View>
                  
                  <View style={[styles.orderCardFooter, { borderTopColor: COLORS.border }]}>
                    <Text style={[styles.orderId, { color: COLORS.textSecondary }]}>
                      #{order.id.slice(-8).toUpperCase()}
                    </Text>
                    <Text style={styles.orderArrow}>→</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={[styles.emptyState, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
              <Text style={styles.emptyEmoji}>📦</Text>
              <Text style={[styles.emptyText, { color: COLORS.text }]}>
                Aún no tienes pedidos
              </Text>
              <Text style={[styles.emptySubtext, { color: COLORS.textSecondary }]}>
                Explora nuestro catálogo y realiza tu primer pedido
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View
          style={[
            styles.section,
            { opacity: fadeAnim },
          ]}
        >
          <Text style={styles.sectionTitle}>Explorar</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              onPress={navigateToCatalog}
              style={styles.actionCard}
              activeOpacity={0.8}
            >
              <View style={styles.actionCardContent}>
                <View style={[styles.actionIconCircle, styles.actionIconPrimary]}>
                  <Text style={styles.actionIcon}>📦</Text>
                </View>
                <Text style={styles.actionTitle}>Catálogo</Text>
                <Text style={styles.actionSubtitle}>Ver productos</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={navigateToCart}
              style={styles.actionCard}
              activeOpacity={0.8}
            >
              <View style={styles.actionCardContent}>
                <View style={[styles.actionIconCircle, styles.actionIconSecondary]}>
                  <Text style={styles.actionIcon}>🛒</Text>
                </View>
                <Text style={styles.actionTitle}>Carrito</Text>
                <Text style={styles.actionSubtitle}>{totalCartItems} items</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Orders' as never)}
              style={styles.actionCardWide}
              activeOpacity={0.8}
            >
              <View style={styles.actionCardWideContent}>
                <View style={styles.actionIconSmall}>
                  <Text style={styles.actionIcon}>📋</Text>
                </View>
                <View style={styles.actionCardWideText}>
                  <Text style={styles.actionTitle}>Mis Pedidos</Text>
                  <Text style={styles.actionSubtitle}>Historial de compras</Text>
                </View>
                <Text style={styles.actionArrow}>→</Text>
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={navigateToProducerList}
            style={styles.customBuilderCard}
            activeOpacity={0.8}
          >
            <View style={styles.customBuilderContent}>
              <View style={styles.customBuilderIcon}>
                <Text style={styles.customBuilderEmoji}>🧑‍🌾</Text>
              </View>
              <View style={styles.customBuilderText}>
                <Text style={styles.customBuilderTitle}>Productores</Text>
                <Text style={styles.customBuilderSubtitle}>
                  Descubre a nuestros agricultores locales
                </Text>
              </View>
              <Text style={styles.actionArrow}>→</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Featured Products */}
        <Animated.View
          style={[
            styles.section,
            { opacity: fadeAnim },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Productos Destacados</Text>
            <TouchableOpacity onPress={navigateToCatalog}>
              <Text style={styles.seeAllText}>Ver todo →</Text>
            </TouchableOpacity>
          </View>
          
          {productsLoading ? (
            <Text style={styles.loadingText}>Cargando productos...</Text>
          ) : products.length > 0 ? (
            products.slice(0, 2).map((product, index) => (
              <Animated.View
                key={product.id}
                style={[
                  styles.featuredCard,
                  {
                    opacity: fadeAnim,
                    transform: [
                      {
                        translateY: fadeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [20 + index * 15, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.featuredCardContent}>
                  <View style={styles.featuredHeader}>
                    <View style={styles.featuredTitleContainer}>
                      <Text style={styles.featuredTitle}>{product.name}</Text>
                      <Text style={styles.featuredWeight}>
                        {product.weightInKg.toFixed(2)} kg
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={styles.featuredDescription} numberOfLines={2}>
                    {product.description}
                  </Text>

                  <View style={styles.featuredFooter}>
                    <View style={styles.featuredTags}>
                      {Array.isArray(product.tags) && product.tags.length > 0
                        ? product.tags.slice(0, 2).map((tag: string, idx: number) => (
                            <View key={idx} style={styles.tag}>
                              <Text style={styles.tagText}>{typeof tag === 'string' ? tag : String(tag)}</Text>
                            </View>
                          ))
                        : null}
                    </View>
                    
                    <TouchableOpacity
                      onPress={() => handleAddToCart(product)}
                      disabled={!product.available || product.stock <= 0}
                      style={[
                        styles.addButton,
                        (!product.available || product.stock <= 0) && styles.addButtonDisabled,
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.addButtonText,
                          (!product.available || product.stock <= 0) && styles.addButtonTextDisabled,
                        ]}
                      >
                        {product.available && product.stock > 0 ? '+' : 'Agotado'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Animated.View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📦</Text>
              <Text style={styles.emptyText}>
                {productsLoading ? 'Cargando productos...' : 'No hay productos disponibles'}
              </Text>
              {productsError && (
                <Text style={styles.errorText}>Error: {productsError}</Text>
              )}
            </View>
          )}
        </Animated.View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            🌱 NUTRIFRESCO
          </Text>
          <Text style={styles.footerSubtext}>
            Tu conexión con lo local y fresco
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const createStyles = (COLORS: any, colorMode: 'dark' | 'light') => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  heroSection: {
    backgroundColor: COLORS.backgroundSecondary,
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 32,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroText: {
    flex: 1,
  },
  heroGreeting: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -1,
    marginBottom: 8,
    lineHeight: 40,
  },
  heroSubtitle: {
    fontSize: 17,
    color: COLORS.textSecondary,
    fontWeight: '400',
    letterSpacing: 0.2,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logoutIcon: {
    fontSize: 20,
  },
  section: {
    marginTop: 32,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
    marginBottom: 20,
  },
  seeAllText: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '600',
  },
  subscriptionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginBottom: 20,
  },
  subscriptionHeader: {
    marginBottom: 16,
  },
  subscriptionPlanContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  subscriptionPlanEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  subscriptionPlan: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  subscriptionLimit: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  subscriptionRenewal: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: COLORS.border,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 5,
  },
  subscriptionUsage: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: 4,
  },
  subscriptionRemaining: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  actionLink: {
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 8,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  actionCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 160,
  },
  actionCardContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  actionIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionIconPrimary: {
    backgroundColor: COLORS.primary,
  },
  actionIconSecondary: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  actionIcon: {
    fontSize: 32,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  actionSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  actionsRow: {
    marginBottom: 16,
  },
  actionCardWide: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionCardWideContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconSmall: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionCardWideText: {
    flex: 1,
  },
  actionArrow: {
    fontSize: 24,
    color: COLORS.primary,
    fontWeight: '300',
  },
  customBuilderCard: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  customBuilderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customBuilderIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  customBuilderEmoji: {
    fontSize: 32,
  },
  customBuilderText: {
    flex: 1,
  },
  customBuilderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  customBuilderSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  featuredCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  featuredCardContent: {
    padding: 24,
  },
  featuredHeader: {
    marginBottom: 16,
  },
  featuredTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  featuredTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    flex: 1,
    marginRight: 12,
    letterSpacing: -0.5,
  },
  featuredWeight: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  featuredDescription: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 24,
    marginBottom: 20,
    fontWeight: '400',
  },
  featuredFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featuredTags: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  tag: {
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 28,
    minWidth: 80,
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  addButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  addButtonTextDisabled: {
    color: COLORS.textSecondary,
  },
  emptyState: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 48,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 17,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
  },
  ordersList: {
    gap: 12,
  },
  orderCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderCardLeft: {
    flex: 1,
  },
  orderCardRight: {
    alignItems: 'flex-end',
  },
  orderStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  orderStatusEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  orderStatusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  orderDate: {
    fontSize: 13,
    marginTop: 4,
  },
  orderWeight: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  demoBadge: {
    fontSize: 11,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  orderItemsPreview: {
    marginBottom: 12,
  },
  orderItemPreview: {
    marginBottom: 8,
  },
  orderItemName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  orderItemProducer: {
    fontSize: 12,
    marginLeft: 4,
  },
  orderMoreItems: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 4,
  },
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  orderId: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  orderArrow: {
    fontSize: 18,
    color: COLORS.primary,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error,
    textAlign: 'center',
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 20,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 20,
    color: COLORS.primary,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  footerSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '400',
  },
});
