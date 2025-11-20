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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useAuthStore } from '../../stores/authStore';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { useProductStore } from '../../stores/productStore';
import { useProducerStore } from '../../stores/producerStore';
import { useCartStore } from '../../stores/cartStore';
import { useThemeStore } from '../../stores/themeStore';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { AlertManager } from '../../utils/AlertManager';
import { ToastManager } from '../../utils/ToastManager';

const { width } = Dimensions.get('window');

export const HomeScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { user, logout } = useAuthStore();
  const { subscription, fetchCurrentSubscription, getRemainingKg, getUsedKg, loading: subscriptionLoading } = useSubscriptionStore();
  const { products, fetchProducts, loading: productsLoading, error: productsError } = useProductStore();
  const { producers, fetchProducers, loading: producersLoading, error: producersError } = useProducerStore();
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
    ]);
    setRefreshing(false);
  };

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
                <Text style={styles.subscriptionPlan}>
                  Plan {subscription.plan}
                </Text>
                <Text style={styles.subscriptionRenewal}>
                  Renovación: {new Date(subscription.renewalDate).toLocaleDateString()}
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
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  subscriptionPlan: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  subscriptionRenewal: {
    fontSize: 14,
    color: COLORS.textSecondary,
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
