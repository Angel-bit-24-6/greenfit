import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../stores/authStore';
import { useCatalogStore } from '../../stores/catalogStore';
import { useCartStore } from '../../stores/cartStore';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import type { MainTabParamList } from '../../navigation/MainTabNavigator';
import { ToastManager } from '../../utils/ToastManager';

export const HomeScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { user, logout } = useAuthStore();
  const { catalog, loading: catalogLoading, error: catalogError } = useCatalogStore();
  const { getTotalItems, addItem } = useCartStore();

  const totalCartItems = getTotalItems();

  const onRefresh = async () => {
    setRefreshing(true);
    // TODO: Recargar datos del catálogo desde API
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Cerrar sesión', 
          style: 'destructive',
          onPress: logout 
        },
      ]
    );
  };

  const navigateToMenu = () => {
    // Navigate to Menu tab programmatically
    navigation.navigate('Main', { screen: 'MenuTab' });
  };

  const navigateToCart = () => {
    // Navigate to Cart tab programmatically
    navigation.navigate('Main', { screen: 'CartTab' });
  };

  const navigateToCustomBuilder = () => {
    navigation.navigate('CustomPlateBuilder');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>¡Hola, {user?.name?.split(' ')[0]}! 👋</Text>
          <Text style={styles.subGreeting}>¿Qué te apetece hoy?</Text>
        </View>
        <Button
          title="Salir"
          onPress={handleLogout}
          variant="outline"
          size="small"
        />
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{catalog?.ingredients?.length || 0}</Text>
          <Text style={styles.statLabel}>Ingredientes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{catalog?.plates?.length || 0}</Text>
          <Text style={styles.statLabel}>Platillos</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalCartItems}</Text>
          <Text style={styles.statLabel}>En carrito</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Acciones rápidas</Text>
        
        <View style={styles.actionGrid}>
          <Button
            title="🍽️ Ver Menú"
            onPress={navigateToMenu}
            style={styles.actionButton}
            size="large"
          />
          
          <Button
            title="🛒 Mi Carrito"
            onPress={navigateToCart}
            variant="secondary"
            style={styles.actionButton}
            size="large"
          />
        </View>

        <View style={styles.actionGrid}>
          <Button
            title="📋 Mis Pedidos"
            onPress={() => navigation.navigate('Orders' as never)}
            variant="outline"
            style={styles.actionButton}
            size="large"
          />
        </View>

        <Button
          title="🎨 Crear Platillo Personalizado"
          onPress={navigateToCustomBuilder}
          variant="outline"
          style={styles.customButton}
          size="large"
        />
      </View>

      {/* Featured Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Destacados del día</Text>
        
        {catalog?.plates?.slice(0, 2).map((plate) => (
          <View key={plate.id} style={styles.featuredCard}>
            <Text style={styles.featuredTitle}>{plate.name}</Text>
            <Text style={styles.featuredDescription}>{plate.description}</Text>
            <View style={styles.featuredFooter}>
              <Text style={styles.featuredPrice}>${plate.price?.toFixed(2) || '0.00'}</Text>
              <Button
                title="Agregar"
                onPress={() => {
                  try {
                    if (!plate.available) {
                      ToastManager.noStock(plate.name);
                      return;
                    }

                    addItem({
                      type: 'plate',
                      plateId: plate.id,
                      quantity: 1,
                      price: plate.price,
                      name: plate.name,
                      image: plate.image || undefined
                    });

                    ToastManager.addedToCart(plate.name, plate.price);
                  } catch (error) {
                    ToastManager.error('Error', 'No se pudo agregar al carrito');
                  }
                }}
                size="small"
                disabled={!plate.available}
              />
            </View>
          </View>
        ))}

        {(!catalog?.plates || catalog.plates.length === 0) && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {catalogLoading ? 'Cargando platillos...' : 'No hay platillos disponibles'}
            </Text>
            {catalogError && (
              <Text style={styles.errorText}>Error: {catalogError}</Text>
            )}
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          🌱 GreenFit - Comida saludable para tu bienestar
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 16,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#15803d',
  },
  subGreeting: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  customButton: {
    marginTop: 8,
  },
  featuredCard: {
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
  featuredTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  featuredDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  featuredFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featuredPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  emptyState: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 8,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 32,
  },
  footerText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
});