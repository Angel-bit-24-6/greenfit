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
import { useCartStore } from '../../stores/cartStore_nutrifresco';
import { useThemeStore } from '../../stores/themeStore';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { AlertManager } from '../../utils/AlertManager';

const { width } = Dimensions.get('window');

export const HomeScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { user, logout } = useAuthStore();
  const { subscription, fetchCurrentSubscription, getRemainingKg, getUsedKg } = useSubscriptionStore();
  const { products, fetchProducts } = useProductStore();
  const { producers, fetchProducers } = useProducerStore();
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
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Load data on mount
    fetchCurrentSubscription();
    fetchProducts({ available: true });
    fetchProducers();

    // Entrance animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Progress bar animation
    Animated.timing(progressAnim, {
      toValue: progressPercentage,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [progressPercentage]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchCurrentSubscription(),
      fetchProducts({ available: true }),
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

  const navigateToSubscription = () => {
    navigation.navigate('Subscription' as never);
  };

  const getPlanName = (plan: string) => {
    const names: Record<string, string> = {
      BASIC: 'Básico',
      STANDARD: 'Estándar',
      PREMIUM: 'Premium',
    };
    return names[plan] || plan;
  };

  // Featured products (seasonal)
  const featuredProducts = products
    .filter(p => p.available && p.season)
    .slice(0, 3);

  // Featured producers
  const featuredProducers = producers
    .filter(p => p.verified)
    .slice(0, 3);

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
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              borderBottomColor: COLORS.border,
            },
          ]}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerText}>
              <Text style={[styles.greeting, { color: COLORS.text }]}>
                Hola, {user?.name?.split(' ')[0]} 👋
              </Text>
              <Text style={[styles.subtitle, { color: COLORS.textSecondary }]}>
                Productos frescos de temporada
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleLogout}
              style={[styles.settingsButton, { borderColor: COLORS.border }]}
              activeOpacity={0.7}
            >
              <Text style={styles.settingsIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Subscription Summary */}
        {subscription && (
          <Animated.View
            style={[
              styles.subscriptionCard,
              {
                opacity: fadeAnim,
                backgroundColor: COLORS.surface,
                borderColor: COLORS.border,
              },
            ]}
          >
            <View style={styles.subscriptionHeader}>
              <View>
                <Text style={[styles.subscriptionTitle, { color: COLORS.text }]}>
                  Plan {getPlanName(subscription.plan)}
                </Text>
                <Text style={[styles.subscriptionSubtitle, { color: COLORS.textSecondary }]}>
                  {limitInKg} kg/mes
                </Text>
              </View>
              <TouchableOpacity
                onPress={navigateToSubscription}
                style={[styles.changePlanButton, { borderColor: COLORS.primary }]}
              >
                <Text style={[styles.changePlanText, { color: COLORS.primary }]}>
                  Cambiar
                </Text>
              </TouchableOpacity>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={[styles.progressBarBg, { backgroundColor: COLORS.surfaceElevated }]}>
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 100],
                        outputRange: ['0%', '100%'],
                      }),
                      backgroundColor: progressPercentage > 80 ? COLORS.error : COLORS.primary,
                    },
                  ]}
                />
              </View>
              <View style={styles.progressTextContainer}>
                <Text style={[styles.progressText, { color: COLORS.text }]}>
                  {usedKg.toFixed(2)} kg usados
                </Text>
                <Text style={[styles.progressText, { color: COLORS.textSecondary }]}>
                  {remainingKg.toFixed(2)} kg restantes
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Quick Actions */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <View style={styles.actionsRow}>
            <TouchableOpacity
              onPress={navigateToCatalog}
              style={[styles.actionButton, { borderColor: COLORS.border }]}
              activeOpacity={0.7}
            >
              <Text style={styles.actionEmoji}>🛒</Text>
              <Text style={[styles.actionLabel, { color: COLORS.text }]}>
                Catálogo
              </Text>
              {totalCartItems > 0 && (
                <View style={[styles.badge, { backgroundColor: COLORS.primary }]}>
                  <Text style={[styles.badgeText, { color: COLORS.background }]}>
                    {totalCartItems}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={navigateToCart}
              style={[styles.actionButton, { borderColor: COLORS.border }]}
              activeOpacity={0.7}
            >
              <Text style={styles.actionEmoji}>🛒</Text>
              <Text style={[styles.actionLabel, { color: COLORS.text }]}>
                Carrito
              </Text>
              {totalWeightInCart > 0 && (
                <Text style={[styles.actionSubtext, { color: COLORS.textSecondary }]}>
                  {totalWeightInCart.toFixed(2)} kg
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('Orders' as never)}
              style={[styles.actionButton, { borderColor: COLORS.border }]}
              activeOpacity={0.7}
            >
              <Text style={styles.actionEmoji}>📋</Text>
              <Text style={[styles.actionLabel, { color: COLORS.text }]}>
                Pedidos
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Featured Products */}
        {featuredProducts.length > 0 && (
          <Animated.View
            style={[
              styles.section,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: COLORS.text }]}>
                Productos de temporada
              </Text>
              <TouchableOpacity onPress={navigateToCatalog}>
                <Text style={[styles.seeAll, { color: COLORS.primary }]}>Ver todo →</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {featuredProducts.map((product) => (
                <TouchableOpacity
                  key={product.id}
                  style={[styles.productCard, { borderColor: COLORS.border }]}
                  onPress={() => navigation.navigate('ProductDetail' as never, { productId: product.id } as never)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.productEmoji}>
                    {product.category === 'FRUITS' ? '🍎' :
                     product.category === 'VEGETABLES' ? '🥬' :
                     product.category === 'LEGUMES' ? '🫘' :
                     product.category === 'HERBS' ? '🌿' :
                     product.category === 'COFFEE' ? '☕' :
                     product.category === 'CHOCOLATE' ? '🍫' :
                     product.category === 'PROTEINS' ? '🥚' : '📦'}
                  </Text>
                  <Text style={[styles.productName, { color: COLORS.text }]} numberOfLines={2}>
                    {product.name}
                  </Text>
                  <Text style={[styles.productWeight, { color: COLORS.primary }]}>
                    {product.weightInKg} kg
                  </Text>
                  {product.origin && (
                    <Text style={[styles.productOrigin, { color: COLORS.textSecondary }]} numberOfLines={1}>
                      {product.origin}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Featured Producers */}
        {featuredProducers.length > 0 && (
          <Animated.View
            style={[
              styles.section,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>
              Productores destacados
            </Text>

            {featuredProducers.map((producer) => (
              <TouchableOpacity
                key={producer.id}
                style={[styles.producerCard, { borderColor: COLORS.border }]}
                onPress={() => navigation.navigate('ProducerProfile' as never, { producerId: producer.id } as never)}
                activeOpacity={0.7}
              >
                <View style={styles.producerContent}>
                  <View style={[styles.producerIcon, { backgroundColor: COLORS.surfaceElevated }]}>
                    <Text style={styles.producerEmoji}>🌾</Text>
                  </View>
                  <View style={styles.producerInfo}>
                    <Text style={[styles.producerName, { color: COLORS.text }]}>
                      {producer.businessName}
                    </Text>
                    {producer.location && (
                      <Text style={[styles.producerLocation, { color: COLORS.textSecondary }]}>
                        📍 {producer.location}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.arrow, { color: COLORS.primary }]}>→</Text>
                </View>
              </TouchableOpacity>
            ))}
          </Animated.View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: COLORS.textSecondary }]}>
            🌱 NUTRIFRESCO
          </Text>
          <Text style={[styles.footerSubtext, { color: COLORS.textSecondary }]}>
            Productos frescos de la región
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const createStyles = (COLORS: any, colorMode: 'dark' | 'light') => StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  settingsIcon: {
    fontSize: 20,
  },
  subscriptionCard: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  subscriptionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  subscriptionSubtitle: {
    fontSize: 14,
  },
  changePlanButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  changePlanText: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressTextContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  seeAll: {
    fontSize: 15,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  actionEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  horizontalScroll: {
    gap: 12,
    paddingRight: 20,
  },
  productCard: {
    width: 140,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  productEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  productWeight: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  productOrigin: {
    fontSize: 11,
    textAlign: 'center',
  },
  producerCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: COLORS.surface,
    marginBottom: 12,
  },
  producerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  producerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  producerEmoji: {
    fontSize: 24,
  },
  producerInfo: {
    flex: 1,
  },
  producerName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  producerLocation: {
    fontSize: 13,
  },
  arrow: {
    fontSize: 20,
    fontWeight: '300',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 13,
  },
});

