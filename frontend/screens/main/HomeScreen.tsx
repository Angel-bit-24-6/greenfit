import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Animated,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useAuthStore } from '../../stores/authStore';
import { useCatalogStore } from '../../stores/catalogStore';
import { useCartStore } from '../../stores/cartStore';
import { useThemeStore } from '../../stores/themeStore';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { ToastManager } from '../../utils/ToastManager';
import { AlertManager } from '../../utils/AlertManager';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;

export const HomeScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { user, logout } = useAuthStore();
  const { catalog, loading: catalogLoading, error: catalogError } = useCatalogStore();
  const { getTotalItems, addItem } = useCartStore();
  const { getThemeColors, currentTheme, colorMode } = useThemeStore();
  const COLORS = getThemeColors();

  const totalCartItems = getTotalItems();
  
  // Create dynamic styles based on current theme and color mode
  const styles = useMemo(() => createStyles(COLORS), [currentTheme.id, colorMode]);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerScale = useRef(new Animated.Value(0.95)).current;
  const statsSlide = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(headerScale, {
        toValue: 1,
        tension: 40,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(statsSlide, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for cart badge
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  };

  const handleLogout = () => {
    AlertManager.confirmDestructive(
      'Cerrar sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      logout
    );
  };

  const navigateToMenu = () => {
    (navigation as any).navigate('Main', { screen: 'MenuTab' });
  };

  const navigateToCart = () => {
    (navigation as any).navigate('Main', { screen: 'CartTab' });
  };

  const navigateToCustomBuilder = () => {
    navigation.navigate('CustomPlateBuilder');
  };

  const handleAddToCart = async (plate: any) => {
    try {
      if (!plate.available) {
        ToastManager.noStock(plate.name);
        return;
      }

      const success = await addItem({
        type: 'plate',
        plateId: plate.id,
        quantity: 1,
        price: plate.price,
        name: plate.name,
        image: plate.image || undefined
      });

      if (success) {
        ToastManager.addedToCart(plate.name, plate.price);
      }
    } catch (error) {
      ToastManager.error('Error', 'No se pudo agregar al carrito');
    }
  };

  return (
    <View style={styles.container}>
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
              transform: [{ scale: headerScale }],
            },
          ]}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroText}>
              <Text style={styles.heroGreeting}>
                Hola, {user?.name?.split(' ')[0]} 👋
              </Text>
              <Text style={styles.heroSubtitle}>
                ¿Listo para comer saludable hoy?
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

        {/* Stats Cards - Horizontal Scroll Style */}
        <Animated.View
          style={[
            styles.statsWrapper,
            {
              opacity: fadeAnim,
              transform: [{ translateY: statsSlide }],
            },
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsContainer}
          >
            <View style={[styles.statCard, styles.statCardPrimary]}>
              <View style={styles.statIconContainer}>
                <Text style={styles.statIcon}>🥬</Text>
              </View>
              <Text style={styles.statNumber}>{catalog?.ingredients?.length || 0}</Text>
              <Text style={styles.statLabel}>Ingredientes</Text>
            </View>

            <View style={[styles.statCard, styles.statCardSecondary]}>
              <View style={styles.statIconContainer}>
                <Text style={styles.statIcon}>🍽️</Text>
              </View>
              <Text style={styles.statNumber}>{catalog?.plates?.length || 0}</Text>
              <Text style={styles.statLabel}>Platillos</Text>
            </View>

            <Animated.View
              style={[
                styles.statCard,
                styles.statCardHighlight,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <View style={[styles.statIconContainer, styles.statIconHighlight]}>
                <Text style={styles.statIcon}>🛒</Text>
              </View>
              <Text style={[styles.statNumber, styles.statNumberHighlight]}>
                {totalCartItems}
              </Text>
              <Text style={styles.statLabel}>En carrito</Text>
            </Animated.View>
          </ScrollView>
        </Animated.View>

        {/* Quick Actions - Modern Card Design */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: statsSlide }],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>Explorar</Text>
          
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              onPress={navigateToMenu}
              style={styles.actionCard}
              activeOpacity={0.8}
            >
              <View style={styles.actionCardContent}>
                <View style={[styles.actionIconCircle, styles.actionIconPrimary]}>
                  <Text style={styles.actionIcon}>🍽️</Text>
                </View>
                <Text style={styles.actionTitle}>Menú</Text>
                <Text style={styles.actionSubtitle}>Ver platillos</Text>
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
            onPress={navigateToCustomBuilder}
            style={styles.customBuilderCard}
            activeOpacity={0.8}
          >
            <View style={styles.customBuilderContent}>
              <View style={styles.customBuilderIcon}>
                <Text style={styles.customBuilderEmoji}>🎨</Text>
              </View>
              <View style={styles.customBuilderText}>
                <Text style={styles.customBuilderTitle}>Creador Personalizado</Text>
                <Text style={styles.customBuilderSubtitle}>
                  Diseña tu platillo ideal
                </Text>
              </View>
              <Text style={styles.actionArrow}>→</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Featured Plates - Large Cards */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: statsSlide }],
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Destacados</Text>
            <TouchableOpacity onPress={navigateToMenu}>
              <Text style={styles.seeAllText}>Ver todo →</Text>
            </TouchableOpacity>
          </View>
          
          {catalog?.plates?.slice(0, 2).map((plate, index) => (
            <Animated.View
              key={plate.id}
              style={[
                styles.featuredCard,
                {
                  opacity: fadeAnim,
                  transform: [
                    {
                      translateY: statsSlide.interpolate({
                        inputRange: [0, 50],
                        outputRange: [0, 20 + index * 15],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.featuredCardContent}>
                <View style={styles.featuredHeader}>
                  <View style={styles.featuredTitleContainer}>
                    <Text style={styles.featuredTitle}>{plate.name}</Text>
                    <Text style={styles.featuredPrice}>
                      ${plate.price?.toFixed(2) || '0.00'}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.featuredDescription} numberOfLines={2}>
                  {plate.description}
                </Text>

                <View style={styles.featuredFooter}>
                  <View style={styles.featuredTags}>
                    {plate.tags?.slice(0, 2).map((tag: string, idx: number) => (
                      <View key={idx} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                  
                  <TouchableOpacity
                    onPress={() => handleAddToCart(plate)}
                    disabled={!plate.available}
                    style={[
                      styles.addButton,
                      !plate.available && styles.addButtonDisabled,
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.addButtonText,
                        !plate.available && styles.addButtonTextDisabled,
                      ]}
                    >
                      {plate.available ? '+' : 'Agotado'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          ))}

          {(!catalog?.plates || catalog.plates.length === 0) && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🍽️</Text>
              <Text style={styles.emptyText}>
                {catalogLoading ? 'Cargando platillos...' : 'No hay platillos disponibles'}
              </Text>
              {catalogError && (
                <Text style={styles.errorText}>Error: {catalogError}</Text>
              )}
            </View>
          )}
        </Animated.View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            🌱 GreenFit
          </Text>
          <Text style={styles.footerSubtext}>
            Comida saludable para tu bienestar
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const createStyles = (COLORS: any) => StyleSheet.create({
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
  // Hero Section
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
  // Stats Section
  statsWrapper: {
    marginTop: 24,
    marginBottom: 8,
  },
  statsContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  statCard: {
    width: 140,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statCardPrimary: {
    backgroundColor: COLORS.surfaceCard,
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  statCardSecondary: {
    backgroundColor: COLORS.surfaceElevated,
  },
  statCardHighlight: {
    backgroundColor: COLORS.surfaceCard,
    borderColor: COLORS.primary,
    borderWidth: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statIconHighlight: {
    backgroundColor: COLORS.primary,
  },
  statIcon: {
    fontSize: 28,
  },
  statNumber: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 4,
    letterSpacing: -1,
  },
  statNumberHighlight: {
    fontSize: 40,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  // Section
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
  // Actions
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
  // Featured Cards
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
  featuredPrice: {
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
  // Empty State
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
  // Footer
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
