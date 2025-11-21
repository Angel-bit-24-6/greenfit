import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  FlatList,
  ActivityIndicator,
  TextInput,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { ToastManager } from '../../utils/ToastManager';
import producerOrderService, { ProducerOrder } from '../../services/producerOrderService';

type TabType = 'orders' | 'deliveries' | 'payments' | 'products' | 'add';

interface ProducerProduct {
  id: string;
  name: string;
  description: string;
  category: string;
  weightInKg: number;
  stock: number;
  available: boolean;
  origin: string;
  image?: string;
}

interface PaymentTransaction {
  id: string;
  orderNumber: string;
  customerName: string;
  date: string;
  amount: number;
  status: 'pending' | 'completed' | 'processing';
  items: string[];
}

export const ProducerDashboardScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('orders');
  const [orders, setOrders] = useState<ProducerOrder[]>([]);
  const [deliveries, setDeliveries] = useState<ProducerOrder[]>([]);
  const [products, setProducts] = useState<ProducerProduct[]>([]);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Form state for adding product
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    category: 'FRUITS',
    weightInKg: '',
    stock: '',
    origin: '',
    available: true,
  });

  const navigation = useNavigation();
  const { user, logout } = useAuthStore();
  const { getThemeColors, currentTheme, colorMode } = useThemeStore();
  const COLORS = getThemeColors();
  
  const styles = useMemo(() => createStyles(COLORS, colorMode), [currentTheme.id, colorMode]);

  useEffect(() => {
    loadOrders();
    loadProducts();
    loadPayments();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const response = await producerOrderService.getMyOrders();
      
      if (response.ok && response.data && response.data.length > 0) {
        // Separar pedidos por estado
        const pendingOrders = response.data.filter(order => order.status === 'pending');
        const activeDeliveries = response.data.filter(order => 
          order.status === 'confirmed' || order.status === 'preparing' || order.status === 'ready'
        );

        setOrders(pendingOrders);
        setDeliveries(activeDeliveries);
      } else {
        // Usar datos de demostración completos
        console.warn('Using demo data for producer orders');
        
        const demoPendingOrders: ProducerOrder[] = [
          {
            id: '1',
            orderNumber: 'NF51434161',
            customerName: 'María González',
            customerEmail: 'maria.gonzalez@email.com',
            customerPhone: '961-123-4567',
            deliveryAddress: 'Calle Los Pinos #123, Col. Cantaranas, Tuxtla Gutiérrez, Chiapas - CP 29050',
            status: 'pending',
            date: new Date(2025, 10, 18).toISOString(),
            items: [
              {
                id: 'item1',
                productName: 'Café Chiapaneco Molido',
                quantity: 2,
                weightInKg: 0.5,
                product: {
                  id: 'prod1',
                  name: 'Café Chiapaneco Molido',
                  category: 'COFFEE',
                  weightInKg: 0.25,
                  image: undefined
                }
              },
              {
                id: 'item2',
                productName: 'Miel Orgánica',
                quantity: 1,
                weightInKg: 0.5,
                product: {
                  id: 'prod2',
                  name: 'Miel Orgánica',
                  category: 'SNACKS',
                  weightInKg: 0.5,
                  image: undefined
                }
              }
            ],
            totalWeightInKg: 1.0,
            notes: 'Por favor entregar en la mañana'
          },
          {
            id: '2',
            orderNumber: 'NF51434162',
            customerName: 'Juan Pérez Martínez',
            customerEmail: 'juan.perez@email.com',
            customerPhone: '961-234-5678',
            deliveryAddress: 'Av. Central #456, San Cristóbal de las Casas, Chiapas - CP 29200',
            status: 'pending',
            date: new Date(2025, 10, 19).toISOString(),
            items: [
              {
                id: 'item3',
                productName: 'Cacao Chiapaneco',
                quantity: 3,
                weightInKg: 1.5,
                product: {
                  id: 'prod3',
                  name: 'Cacao Chiapaneco',
                  category: 'CHOCOLATE',
                  weightInKg: 0.5,
                  image: undefined
                }
              }
            ],
            totalWeightInKg: 1.5,
            notes: undefined
          },
          {
            id: '3',
            orderNumber: 'NF51434163',
            customerName: 'Ana López Silva',
            customerEmail: 'ana.lopez@email.com',
            customerPhone: '961-345-6789',
            deliveryAddress: 'Calle Principal #789, Comitán, Chiapas - CP 30000',
            status: 'pending',
            date: new Date(2025, 10, 20).toISOString(),
            items: [
              {
                id: 'item4',
                productName: 'Café Chiapaneco Molido',
                quantity: 1,
                weightInKg: 0.25,
                product: {
                  id: 'prod1',
                  name: 'Café Chiapaneco Molido',
                  category: 'COFFEE',
                  weightInKg: 0.25,
                  image: undefined
                }
              },
              {
                id: 'item5',
                productName: 'Chocolate Artesanal 70%',
                quantity: 2,
                weightInKg: 0.4,
                product: {
                  id: 'prod4',
                  name: 'Chocolate Artesanal 70%',
                  category: 'CHOCOLATE',
                  weightInKg: 0.2,
                  image: undefined
                }
              }
            ],
            totalWeightInKg: 0.65,
            notes: 'Tocar el timbre 2 veces'
          },
          {
            id: '4',
            orderNumber: 'NF51434164',
            customerName: 'Carlos Ramírez Torres',
            customerEmail: 'carlos.ramirez@email.com',
            customerPhone: '961-456-7890',
            deliveryAddress: 'Colonia Vista Hermosa #234, Tapachula, Chiapas - CP 30700',
            status: 'pending',
            date: new Date(2025, 10, 20).toISOString(),
            items: [
              {
                id: 'item6',
                productName: 'Miel Orgánica',
                quantity: 3,
                weightInKg: 1.5,
                product: {
                  id: 'prod2',
                  name: 'Miel Orgánica',
                  category: 'SNACKS',
                  weightInKg: 0.5,
                  image: undefined
                }
              },
              {
                id: 'item7',
                productName: 'Café Chiapaneco Molido',
                quantity: 2,
                weightInKg: 0.5,
                product: {
                  id: 'prod1',
                  name: 'Café Chiapaneco Molido',
                  category: 'COFFEE',
                  weightInKg: 0.25,
                  image: undefined
                }
              }
            ],
            totalWeightInKg: 2.0,
            notes: undefined
          }
        ];

        const demoActiveDeliveries: ProducerOrder[] = [
          {
            id: '5',
            orderNumber: 'NF51434160',
            customerName: 'Patricia Hernández',
            customerEmail: 'patricia.h@email.com',
            customerPhone: '961-567-8901',
            deliveryAddress: 'Fraccionamiento Las Flores #567, Tuxtla Gutiérrez, Chiapas - CP 29045',
            status: 'preparing',
            date: new Date(2025, 10, 17).toISOString(),
            items: [
              {
                id: 'item8',
                productName: 'Cacao Chiapaneco',
                quantity: 2,
                weightInKg: 1.0,
                product: {
                  id: 'prod3',
                  name: 'Cacao Chiapaneco',
                  category: 'CHOCOLATE',
                  weightInKg: 0.5,
                  image: undefined
                }
              }
            ],
            totalWeightInKg: 1.0,
            notes: 'Edificio azul, Depto 302'
          },
          {
            id: '6',
            orderNumber: 'NF51434159',
            customerName: 'Roberto Sánchez',
            customerEmail: 'roberto.sanchez@email.com',
            customerPhone: '961-678-9012',
            deliveryAddress: 'Barrio Guadalupe #890, Chiapa de Corzo, Chiapas - CP 29160',
            status: 'ready',
            date: new Date(2025, 10, 16).toISOString(),
            items: [
              {
                id: 'item9',
                productName: 'Chocolate Artesanal 70%',
                quantity: 5,
                weightInKg: 1.0,
                product: {
                  id: 'prod4',
                  name: 'Chocolate Artesanal 70%',
                  category: 'CHOCOLATE',
                  weightInKg: 0.2,
                  image: undefined
                }
              },
              {
                id: 'item10',
                productName: 'Miel Orgánica',
                quantity: 1,
                weightInKg: 0.5,
                product: {
                  id: 'prod2',
                  name: 'Miel Orgánica',
                  category: 'SNACKS',
                  weightInKg: 0.5,
                  image: undefined
                }
              }
            ],
            totalWeightInKg: 1.5,
            notes: undefined
          },
          {
            id: '7',
            orderNumber: 'NF51434158',
            customerName: 'Lucía Morales',
            customerEmail: 'lucia.morales@email.com',
            customerPhone: '961-789-0123',
            deliveryAddress: 'Centro Histórico #123, San Cristóbal de las Casas, Chiapas - CP 29250',
            status: 'ready',
            date: new Date(2025, 10, 15).toISOString(),
            items: [
              {
                id: 'item11',
                productName: 'Café Chiapaneco Molido',
                quantity: 4,
                weightInKg: 1.0,
                product: {
                  id: 'prod1',
                  name: 'Café Chiapaneco Molido',
                  category: 'COFFEE',
                  weightInKg: 0.25,
                  image: undefined
                }
              }
            ],
            totalWeightInKg: 1.0,
            notes: 'Local comercial, entregar antes de las 2pm'
          }
        ];

        setOrders(demoPendingOrders);
        setDeliveries(demoActiveDeliveries);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      ToastManager.error('Error', 'No se pudieron cargar los pedidos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadProducts = () => {
    // Datos de demostración de productos
    const demoProducts: ProducerProduct[] = [
      {
        id: '1',
        name: 'Café Chiapaneco Molido',
        description: 'Café molido de altura, tostado artesanalmente',
        category: 'COFFEE',
        weightInKg: 0.25,
        stock: 45,
        available: true,
        origin: 'Sierra de Chiapas',
      },
      {
        id: '2',
        name: 'Miel Orgánica',
        description: 'Miel 100% natural de flores silvestres',
        category: 'SNACKS',
        weightInKg: 0.5,
        stock: 28,
        available: true,
        origin: 'Valle de Chiapas',
      },
      {
        id: '3',
        name: 'Cacao Chiapaneco',
        description: 'Cacao en grano de la región Soconusco',
        category: 'CHOCOLATE',
        weightInKg: 0.5,
        stock: 15,
        available: true,
        origin: 'Soconusco, Chiapas',
      },
      {
        id: '4',
        name: 'Chocolate Artesanal 70%',
        description: 'Chocolate artesanal con 70% cacao',
        category: 'CHOCOLATE',
        weightInKg: 0.2,
        stock: 32,
        available: true,
        origin: 'Sierra de Chiapas',
      },
      {
        id: '5',
        name: 'Café en Grano Premium',
        description: 'Café en grano sin tostar, calidad exportación',
        category: 'COFFEE',
        weightInKg: 0.5,
        stock: 8,
        available: true,
        origin: 'Montañas de Chiapas',
      },
      {
        id: '6',
        name: 'Polen de Abeja',
        description: 'Polen natural recolectado por abejas',
        category: 'SNACKS',
        weightInKg: 0.1,
        stock: 0,
        available: false,
        origin: 'Valle de Chiapas',
      },
    ];

    setProducts(demoProducts);
  };

  const loadPayments = () => {
    // Datos de demostración de transacciones
    const demoPayments: PaymentTransaction[] = [
      {
        id: '1',
        orderNumber: 'NF51434161',
        customerName: 'María González',
        date: new Date(2025, 10, 18).toISOString(),
        amount: 750.00,
        status: 'completed',
        items: ['Café Chiapaneco (2 kg)', 'Miel Orgánica (1 kg)'],
      },
      {
        id: '2',
        orderNumber: 'NF51434162',
        customerName: 'Juan Pérez Martínez',
        date: new Date(2025, 10, 19).toISOString(),
        amount: 450.00,
        status: 'processing',
        items: ['Cacao Chiapaneco (3 kg)'],
      },
      {
        id: '3',
        orderNumber: 'NF51434163',
        customerName: 'Ana López Silva',
        date: new Date(2025, 10, 20).toISOString(),
        amount: 325.00,
        status: 'pending',
        items: ['Café Chiapaneco (1 kg)', 'Chocolate Artesanal (2 kg)'],
      },
      {
        id: '4',
        orderNumber: 'NF51434164',
        customerName: 'Carlos Ramírez Torres',
        date: new Date(2025, 10, 20).toISOString(),
        amount: 1200.00,
        status: 'pending',
        items: ['Miel Orgánica (3 kg)', 'Café Chiapaneco (2 kg)'],
      },
      {
        id: '5',
        orderNumber: 'NF51434160',
        customerName: 'Patricia Hernández',
        date: new Date(2025, 10, 17).toISOString(),
        amount: 500.00,
        status: 'completed',
        items: ['Cacao Chiapaneco (2 kg)'],
      },
      {
        id: '6',
        orderNumber: 'NF51434159',
        customerName: 'Roberto Sánchez',
        date: new Date(2025, 10, 16).toISOString(),
        amount: 750.00,
        status: 'completed',
        items: ['Chocolate Artesanal (5 kg)', 'Miel Orgánica (1 kg)'],
      },
    ];

    setPayments(demoPayments);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadOrders();
    if (activeTab === 'products') {
      loadProducts();
    }
    if (activeTab === 'payments') {
      loadPayments();
    }
    setRefreshing(false);
  };

  const handleToggleProductAvailability = (productId: string) => {
    setProducts(prev => 
      prev.map(product => 
        product.id === productId 
          ? { ...product, available: !product.available }
          : product
      )
    );
    ToastManager.success(
      'Actualizado', 
      'Disponibilidad del producto actualizada'
    );
  };

  const getCategoryName = (category: string): string => {
    const categoryMap: { [key: string]: string } = {
      'FRUITS': 'Frutas',
      'VEGETABLES': 'Verduras',
      'LEGUMES': 'Leguminosas',
      'HERBS': 'Hierbas',
      'SNACKS': 'Snacks',
      'COFFEE': 'Café',
      'CHOCOLATE': 'Chocolate',
      'PROTEINS': 'Proteínas',
    };
    return categoryMap[category] || category;
  };

  const categories = [
    { value: 'FRUITS', label: 'Frutas' },
    { value: 'VEGETABLES', label: 'Verduras' },
    { value: 'LEGUMES', label: 'Leguminosas' },
    { value: 'HERBS', label: 'Hierbas' },
    { value: 'SNACKS', label: 'Snacks' },
    { value: 'COFFEE', label: 'Café' },
    { value: 'CHOCOLATE', label: 'Chocolate' },
    { value: 'PROTEINS', label: 'Proteínas' },
  ];

  const handleAddProduct = () => {
    // Validación
    if (!newProduct.name.trim()) {
      ToastManager.error('Error', 'El nombre del producto es requerido');
      return;
    }
    if (!newProduct.description.trim()) {
      ToastManager.error('Error', 'La descripción es requerida');
      return;
    }
    if (!newProduct.weightInKg || parseFloat(newProduct.weightInKg) <= 0) {
      ToastManager.error('Error', 'El peso debe ser mayor a 0');
      return;
    }
    if (!newProduct.stock || parseInt(newProduct.stock) < 0) {
      ToastManager.error('Error', 'El stock debe ser mayor o igual a 0');
      return;
    }
    if (!newProduct.origin.trim()) {
      ToastManager.error('Error', 'El origen es requerido');
      return;
    }

    // Crear nuevo producto
    const product: ProducerProduct = {
      id: Date.now().toString(),
      name: newProduct.name.trim(),
      description: newProduct.description.trim(),
      category: newProduct.category,
      weightInKg: parseFloat(newProduct.weightInKg),
      stock: parseInt(newProduct.stock),
      origin: newProduct.origin.trim(),
      available: newProduct.available,
    };

    // Agregar a la lista
    setProducts(prev => [product, ...prev]);

    // Resetear formulario
    setNewProduct({
      name: '',
      description: '',
      category: 'FRUITS',
      weightInKg: '',
      stock: '',
      origin: '',
      available: true,
    });

    // Cambiar a tab de productos
    setActiveTab('products');

    ToastManager.success('Producto agregado', `${product.name} se agregó exitosamente`);
  };

  const handleAcceptOrder = async (orderId: string) => {
    try {
      const response = await producerOrderService.updateOrderStatus(orderId, 'preparing');
      
      if (response.ok) {
        ToastManager.success('Pedido aceptado', `Pedido marcado como preparando`);
        
        // Mover pedido de orders a deliveries
        const acceptedOrder = orders.find(order => order.id === orderId);
        if (acceptedOrder) {
          setOrders(prev => prev.filter(order => order.id !== orderId));
          setDeliveries(prev => [...prev, { ...acceptedOrder, status: 'preparing' }]);
        }
      } else {
        ToastManager.error('Error', response.message || 'No se pudo actualizar el pedido');
      }
    } catch (error) {
      console.error('Error accepting order:', error);
      ToastManager.error('Error', 'No se pudo aceptar el pedido');
    }
  };

  const handleLogout = async () => {
    try {
      // Mostrar mensaje antes de cerrar sesión
      ToastManager.success('Sesión cerrada', 'Hasta pronto');
      
      // Limpiar estados locales
      setOrders([]);
      setDeliveries([]);
      
      // Hacer logout (esto limpiará el token y cambiará isAuthenticated a false)
      await logout();
      
      // El AppNavigator detectará automáticamente que isAuthenticated es false
      // y mostrará la pantalla de login
    } catch (error) {
      console.error('Error during logout:', error);
      ToastManager.error('Error', 'No se pudo cerrar sesión');
    }
  };

  const renderOrderCard = ({ item }: { item: ProducerOrder }) => {
    // Calcular el total de productos del productor
    const totalProducts = item.items.reduce((sum, orderItem) => sum + orderItem.quantity, 0);
    const formattedDate = new Date(item.date).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.customerName}>{item.customerName}</Text>
            <View style={styles.dateRow}>
              <Text style={styles.dateIcon}>📅</Text>
              <Text style={styles.dateText}>{formattedDate}</Text>
            </View>
          </View>
          {item.status === 'pending' && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>Nuevo</Text>
            </View>
          )}
        </View>

        <View style={styles.orderDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>📞</Text>
            <Text style={styles.detailText}>{item.customerPhone}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>📍</Text>
            <Text style={styles.detailText}>{item.deliveryAddress}</Text>
          </View>
        </View>

        <View style={styles.orderSummary}>
          {item.items.map((orderItem, index) => (
            <View key={index} style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{orderItem.productName}:</Text>
              <Text style={styles.summaryValue}>{orderItem.quantity} kg</Text>
            </View>
          ))}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Peso Total:</Text>
            <Text style={styles.summaryValueBold}>{item.totalWeightInKg} kg</Text>
          </View>
        </View>

        {item.status === 'pending' && (
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => handleAcceptOrder(item.id)}
            activeOpacity={0.8}
          >
            <Text style={styles.acceptButtonIcon}>🚚</Text>
            <Text style={styles.acceptButtonText}>Aceptar y Preparar para Entrega</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderContent = () => {
    if (loading && !refreshing) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      );
    }

    switch (activeTab) {
      case 'orders':
        if (orders.length === 0) {
          return (
            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.emptyStateContainer}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={COLORS.primary}
                />
              }
            >
              <View style={styles.contentContainer}>
                <Text style={styles.sectionTitle}>Pedidos Pendientes</Text>
                <Text style={styles.sectionSubtitle}>
                  Revisa y acepta los pedidos de tus clientes
                </Text>
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>📦</Text>
                  <Text style={styles.emptyText}>No hay pedidos pendientes</Text>
                </View>
              </View>
            </ScrollView>
          );
        }
        
        return (
          <FlatList
            data={orders}
            renderItem={renderOrderCard}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View style={styles.listHeader}>
                <Text style={styles.sectionTitle}>Pedidos Pendientes</Text>
                <Text style={styles.sectionSubtitle}>
                  Revisa y acepta los pedidos de tus clientes
                </Text>
              </View>
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={COLORS.primary}
              />
            }
          />
        );

      case 'deliveries':
        if (deliveries.length === 0) {
          return (
            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.emptyStateContainer}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={COLORS.primary}
                />
              }
            >
              <View style={styles.contentContainer}>
                <Text style={styles.sectionTitle}>Entregas</Text>
                <Text style={styles.sectionSubtitle}>
                  Pedidos listos para entregar
                </Text>
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>🚚</Text>
                  <Text style={styles.emptyText}>No hay entregas pendientes</Text>
                </View>
              </View>
            </ScrollView>
          );
        }
        
        return (
          <FlatList
            data={deliveries}
            renderItem={renderOrderCard}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View style={styles.listHeader}>
                <Text style={styles.sectionTitle}>Entregas</Text>
                <Text style={styles.sectionSubtitle}>
                  Pedidos listos para entregar
                </Text>
              </View>
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={COLORS.primary}
              />
            }
          />
        );

      case 'payments':
        // Calcular estadísticas
        const totalEarnings = payments.reduce((sum, p) => sum + p.amount, 0);
        const completedPayments = payments.filter(p => p.status === 'completed');
        const pendingPayments = payments.filter(p => p.status === 'pending');
        const processingPayments = payments.filter(p => p.status === 'processing');
        
        const completedAmount = completedPayments.reduce((sum, p) => sum + p.amount, 0);
        const pendingAmount = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

        return (
          <FlatList
            data={payments}
            renderItem={({ item }) => {
              const formattedDate = new Date(item.date).toLocaleDateString('es-MX', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              });

              const statusConfig = {
                completed: { label: 'Completado', color: '#4CAF50', bg: '#E8F5E9', icon: '✓' },
                processing: { label: 'Procesando', color: '#FF9800', bg: '#FFF3E0', icon: '⏳' },
                pending: { label: 'Pendiente', color: '#F44336', bg: '#FFEBEE', icon: '⏱' },
              };

              const status = statusConfig[item.status];

              return (
                <View style={styles.paymentCard}>
                  <View style={styles.paymentHeader}>
                    <View>
                      <Text style={styles.paymentOrderNumber}>#{item.orderNumber}</Text>
                      <Text style={styles.paymentCustomer}>{item.customerName}</Text>
                      <Text style={styles.paymentDate}>📅 {formattedDate}</Text>
                    </View>
                    <View style={[styles.paymentStatusBadge, { backgroundColor: status.bg }]}>
                      <Text style={[styles.paymentStatusIcon, { color: status.color }]}>
                        {status.icon}
                      </Text>
                      <Text style={[styles.paymentStatusText, { color: status.color }]}>
                        {status.label}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.paymentItems}>
                    {item.items.map((itemName, index) => (
                      <Text key={index} style={styles.paymentItem}>
                        • {itemName}
                      </Text>
                    ))}
                  </View>

                  <View style={styles.paymentFooter}>
                    <Text style={styles.paymentAmountLabel}>Monto:</Text>
                    <Text style={styles.paymentAmount}>${item.amount.toFixed(2)} MXN</Text>
                  </View>
                </View>
              );
            }}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View style={styles.paymentsHeader}>
                <Text style={styles.sectionTitle}>💰 Cobros y Ventas</Text>
                <Text style={styles.sectionSubtitle}>
                  Resumen de tus ingresos y transacciones
                </Text>

                {/* Estadísticas */}
                <View style={styles.statsContainer}>
                  <View style={[styles.statCard, styles.statCardPrimary]}>
                    <Text style={styles.statIcon}>💵</Text>
                    <Text style={styles.statValue}>${totalEarnings.toFixed(2)}</Text>
                    <Text style={styles.statLabel}>Total Ventas</Text>
                  </View>

                  <View style={[styles.statCard, styles.statCardSuccess]}>
                    <Text style={styles.statIcon}>✅</Text>
                    <Text style={styles.statValue}>${completedAmount.toFixed(2)}</Text>
                    <Text style={styles.statLabel}>Completados ({completedPayments.length})</Text>
                  </View>

                  <View style={[styles.statCard, styles.statCardWarning]}>
                    <Text style={styles.statIcon}>⏳</Text>
                    <Text style={styles.statValue}>${pendingAmount.toFixed(2)}</Text>
                    <Text style={styles.statLabel}>Pendientes ({pendingPayments.length})</Text>
                  </View>
                </View>

                <Text style={styles.transactionsTitle}>Transacciones Recientes</Text>
              </View>
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={COLORS.primary}
              />
            }
          />
        );

      case 'products':
        if (products.length === 0) {
          return (
            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.emptyStateContainer}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={COLORS.primary}
                />
              }
            >
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🌱</Text>
                <Text style={styles.emptyText}>No hay productos</Text>
                <Text style={styles.emptySubtext}>Agrega tu primer producto</Text>
              </View>
            </ScrollView>
          );
        }

        return (
          <FlatList
            data={products}
            renderItem={({ item }) => (
              <View style={styles.productCard}>
                <View style={styles.productHeader}>
                  <View style={styles.productTitleRow}>
                    <Text style={styles.productName}>{item.name}</Text>
                    <TouchableOpacity
                      style={[
                        styles.availabilityBadge,
                        item.available ? styles.availableBadge : styles.unavailableBadge
                      ]}
                      onPress={() => handleToggleProductAvailability(item.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.availabilityText}>
                        {item.available ? '✓ Disponible' : '✕ No disponible'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.productDescription}>{item.description}</Text>
                </View>

                <View style={styles.productDetails}>
                  <View style={styles.productDetailRow}>
                    <Text style={styles.productDetailIcon}>📦</Text>
                    <Text style={styles.productDetailLabel}>Categoría:</Text>
                    <Text style={styles.productDetailValue}>
                      {getCategoryName(item.category)}
                    </Text>
                  </View>
                  <View style={styles.productDetailRow}>
                    <Text style={styles.productDetailIcon}>⚖️</Text>
                    <Text style={styles.productDetailLabel}>Peso unitario:</Text>
                    <Text style={styles.productDetailValue}>{item.weightInKg} kg</Text>
                  </View>
                  <View style={styles.productDetailRow}>
                    <Text style={styles.productDetailIcon}>📍</Text>
                    <Text style={styles.productDetailLabel}>Origen:</Text>
                    <Text style={styles.productDetailValue}>{item.origin}</Text>
                  </View>
                  <View style={styles.productDetailRow}>
                    <Text style={styles.productDetailIcon}>
                      {item.stock > 10 ? '✅' : item.stock > 0 ? '⚠️' : '❌'}
                    </Text>
                    <Text style={styles.productDetailLabel}>Stock:</Text>
                    <Text style={[
                      styles.productDetailValue,
                      item.stock === 0 && styles.outOfStock,
                      item.stock > 0 && item.stock <= 10 && styles.lowStock
                    ]}>
                      {item.stock} unidades
                      {item.stock === 0 && ' (Agotado)'}
                      {item.stock > 0 && item.stock <= 10 && ' (Stock bajo)'}
                    </Text>
                  </View>
                </View>

                <View style={styles.productActions}>
                  <TouchableOpacity 
                    style={styles.productActionButton}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.productActionIcon}>✏️</Text>
                    <Text style={styles.productActionText}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.productActionButton, styles.productActionButtonDanger]}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.productActionIcon}>🗑️</Text>
                    <Text style={styles.productActionText}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View style={styles.listHeader}>
                <Text style={styles.sectionTitle}>Mis Productos</Text>
                <Text style={styles.sectionSubtitle}>
                  Gestiona tu catálogo de productos
                </Text>
              </View>
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={COLORS.primary}
              />
            }
          />
        );

      case 'add':
        return (
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.addProductContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={COLORS.primary}
              />
            }
          >
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>➕ Agregar Nuevo Producto</Text>
              <Text style={styles.formSubtitle}>Completa la información de tu producto</Text>

              {/* Nombre */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nombre del Producto *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej: Café Chiapaneco Molido"
                  placeholderTextColor={COLORS.textSecondary}
                  value={newProduct.name}
                  onChangeText={(text) => setNewProduct({ ...newProduct, name: text })}
                />
              </View>

              {/* Descripción */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Descripción *</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  placeholder="Describe las características de tu producto"
                  placeholderTextColor={COLORS.textSecondary}
                  value={newProduct.description}
                  onChangeText={(text) => setNewProduct({ ...newProduct, description: text })}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Categoría */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Categoría *</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.categoryScroll}
                >
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.value}
                      style={[
                        styles.categoryChip,
                        newProduct.category === cat.value && styles.categoryChipActive
                      ]}
                      onPress={() => setNewProduct({ ...newProduct, category: cat.value })}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.categoryChipText,
                        newProduct.category === cat.value && styles.categoryChipTextActive
                      ]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Peso y Stock en fila */}
              <View style={styles.formRow}>
                <View style={[styles.formGroup, styles.formGroupHalf]}>
                  <Text style={styles.formLabel}>Peso (kg) *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="0.25"
                    placeholderTextColor={COLORS.textSecondary}
                    value={newProduct.weightInKg}
                    onChangeText={(text) => setNewProduct({ ...newProduct, weightInKg: text })}
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={[styles.formGroup, styles.formGroupHalf]}>
                  <Text style={styles.formLabel}>Stock *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="50"
                    placeholderTextColor={COLORS.textSecondary}
                    value={newProduct.stock}
                    onChangeText={(text) => setNewProduct({ ...newProduct, stock: text })}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              {/* Origen */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Origen *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej: Sierra de Chiapas"
                  placeholderTextColor={COLORS.textSecondary}
                  value={newProduct.origin}
                  onChangeText={(text) => setNewProduct({ ...newProduct, origin: text })}
                />
              </View>

              {/* Disponibilidad */}
              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <View>
                    <Text style={styles.formLabel}>Disponible para venta</Text>
                    <Text style={styles.switchDescription}>
                      {newProduct.available ? 'Los clientes pueden ver y comprar este producto' : 'El producto estará oculto para los clientes'}
                    </Text>
                  </View>
                  <Switch
                    value={newProduct.available}
                    onValueChange={(value) => setNewProduct({ ...newProduct, available: value })}
                    trackColor={{ false: COLORS.border, true: COLORS.primary }}
                    thumbColor={newProduct.available ? '#FFFFFF' : '#F4F3F4'}
                  />
                </View>
              </View>

              {/* Botones */}
              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setNewProduct({
                      name: '',
                      description: '',
                      category: 'FRUITS',
                      weightInKg: '',
                      stock: '',
                      origin: '',
                      available: true,
                    });
                    ToastManager.info('Cancelado', 'Formulario limpiado');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>Limpiar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleAddProduct}
                  activeOpacity={0.8}
                >
                  <Text style={styles.submitButtonText}>✓ Agregar Producto</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.formNote}>* Campos obligatorios</Text>
            </View>
          </ScrollView>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image 
            source={require('../../public/logoapp.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.headerTitles}>
            <Text style={styles.headerTitle}>NUTRIFRESCO</Text>
            <Text style={styles.headerSubtitle}>Frescura que se nota, calidad que se siente</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Text style={styles.logoutButtonText}>🚪 Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
        >
          <TouchableOpacity
            style={[styles.tab, activeTab === 'orders' && styles.tabActive]}
            onPress={() => setActiveTab('orders')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'orders' && styles.tabTextActive]}>
              Pedidos
            </Text>
            {orders.length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{orders.length}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'deliveries' && styles.tabActive]}
            onPress={() => setActiveTab('deliveries')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'deliveries' && styles.tabTextActive]}>
              Entregas
            </Text>
            {deliveries.length > 0 && (
              <View style={[styles.tabBadge, styles.tabBadgeBlue]}>
                <Text style={styles.tabBadgeText}>{deliveries.length}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'payments' && styles.tabActive]}
            onPress={() => setActiveTab('payments')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'payments' && styles.tabTextActive]}>
              Cobros
            </Text>
          </TouchableOpacity>

           <TouchableOpacity
             style={[styles.tab, activeTab === 'products' && styles.tabActive]}
             onPress={() => setActiveTab('products')}
             activeOpacity={0.7}
           >
             <Text style={[styles.tabText, activeTab === 'products' && styles.tabTextActive]}>
               Productos
             </Text>
             {products.length > 0 && (
               <View style={[styles.tabBadge, styles.tabBadgeGreen]}>
                 <Text style={styles.tabBadgeText}>{products.length}</Text>
               </View>
             )}
           </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'add' && styles.tabActive]}
            onPress={() => setActiveTab('add')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'add' && styles.tabTextActive]}>
              Agregar
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Content */}
      {renderContent()}

      {/* Floating Help Button */}
      <TouchableOpacity style={styles.helpButton} activeOpacity={0.8}>
        <Text style={styles.helpButtonText}>?</Text>
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (COLORS: any, colorMode: 'dark' | 'light') => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorMode === 'light' ? '#F5F8F5' : COLORS.background,
  },
  
  // Header
  header: {
    backgroundColor: COLORS.background,
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logo: {
    width: 50,
    height: 50,
    marginRight: 12,
  },
  headerTitles: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  userEmail: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
    marginBottom: 6,
  },
  logoutButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  logoutButtonText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  
  // Tabs
  tabsContainer: {
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabsScroll: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  tabBadge: {
    backgroundColor: '#E74C3C',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  tabBadgeBlue: {
    backgroundColor: '#3498DB',
  },
  tabBadgeGreen: {
    backgroundColor: '#4CAF50',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  
  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Order Card
  orderCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colorMode === 'light' ? '#E8F5E9' : COLORS.border,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  dateText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  newBadge: {
    backgroundColor: '#FF9800',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  newBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  
  // Order Details
  orderDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  detailText: {
    fontSize: 14,
    color: COLORS.text,
  },
  
  // Order Summary
  orderSummary: {
    backgroundColor: colorMode === 'light' ? '#F9FBF9' : COLORS.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  summaryValueBold: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '700',
  },
  
  // Accept Button
  acceptButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  acceptButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  
  // Loading & Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  
  // Add Product Form
  addProductContainer: {
    padding: 16,
  },
  formContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  formGroupHalf: {
    flex: 1,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: colorMode === 'light' ? '#F9FBF9' : COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  formTextArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  categoryScroll: {
    marginTop: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colorMode === 'light' ? '#F5F5F5' : COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    maxWidth: '80%',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colorMode === 'light' ? '#F5F5F5' : COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  submitButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  formNote: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 12,
    textAlign: 'center',
  },
  
  // Payments Section
  paymentsHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  statCardPrimary: {
    backgroundColor: colorMode === 'light' ? '#E3F2FD' : '#1565C0',
    borderColor: '#2196F3',
  },
  statCardSuccess: {
    backgroundColor: colorMode === 'light' ? '#E8F5E9' : '#1B5E20',
    borderColor: '#4CAF50',
  },
  statCardWarning: {
    backgroundColor: colorMode === 'light' ? '#FFF3E0' : '#E65100',
    borderColor: '#FF9800',
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  transactionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 8,
    marginBottom: 4,
  },
  paymentCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colorMode === 'light' ? '#E8F5E9' : COLORS.border,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  paymentOrderNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  paymentCustomer: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  paymentDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  paymentStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  paymentStatusIcon: {
    fontSize: 14,
    fontWeight: '700',
  },
  paymentStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  paymentItems: {
    backgroundColor: colorMode === 'light' ? '#F9FBF9' : COLORS.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  paymentItem: {
    fontSize: 13,
    color: COLORS.text,
    marginBottom: 4,
  },
  paymentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  paymentAmountLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  paymentAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4CAF50',
  },
  
  // Product Card
  productCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colorMode === 'light' ? '#E8F5E9' : COLORS.border,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  productHeader: {
    marginBottom: 12,
  },
  productTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    marginRight: 12,
  },
  productDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  availabilityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  availableBadge: {
    backgroundColor: colorMode === 'light' ? '#E8F5E9' : '#1B5E20',
    borderColor: '#4CAF50',
  },
  unavailableBadge: {
    backgroundColor: colorMode === 'light' ? '#FFEBEE' : '#B71C1C',
    borderColor: '#F44336',
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  productDetails: {
    backgroundColor: colorMode === 'light' ? '#F9FBF9' : COLORS.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  productDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  productDetailIcon: {
    fontSize: 16,
    marginRight: 8,
    width: 24,
  },
  productDetailLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginRight: 6,
  },
  productDetailValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
    flex: 1,
  },
  outOfStock: {
    color: '#F44336',
  },
  lowStock: {
    color: '#FF9800',
  },
  productActions: {
    flexDirection: 'row',
    gap: 12,
  },
  productActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colorMode === 'light' ? '#F5F5F5' : COLORS.surface,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  productActionButtonDanger: {
    borderColor: '#F44336',
  },
  productActionIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  productActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  
  // Help Button
  helpButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  helpButtonText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

