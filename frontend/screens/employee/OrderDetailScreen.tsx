import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useEmployeeStore } from '../../stores/employeeStore';
import { useCatalogStore } from '../../stores/catalogStore';
import { IngredientsList } from '../../components/IngredientsList';
import { 
  getPlateBaseIngredients, 
  getIngredientsDetails,
  formatPrice 
} from '../../utils/catalogHelpers';
import type { KitchenOrder } from '../../stores/employeeStore';
import type { IngredientDetail } from '../../types/domain';

interface OrderDetailScreenProps {
  navigation: any;
  route: {
    params: {
      orderId: string;
    };
  };
}

const OrderDetailScreen: React.FC<OrderDetailScreenProps> = ({ navigation, route }) => {
  const { orderId } = route.params;
  const {
    employee,
    selectedOrder,
    isUpdatingStatus,
    fetchOrderDetails,
    updateOrderStatus,
  } = useEmployeeStore();
  const { catalog } = useCatalogStore();

  const [order, setOrder] = useState<KitchenOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [itemsWithIngredients, setItemsWithIngredients] = useState<Array<{
    item: any;
    baseIngredients: IngredientDetail[];
    customIngredients: IngredientDetail[];
  }>>([]);

  useEffect(() => {
    loadOrderDetails();
  }, [orderId]);

  useEffect(() => {
    if (selectedOrder && selectedOrder.id === orderId) {
      setOrder(selectedOrder);
      loadItemsIngredients(selectedOrder);
    }
  }, [selectedOrder]);

  const loadOrderDetails = async () => {
    setLoading(true);
    const orderData = await fetchOrderDetails(orderId);
    if (orderData) {
      setOrder(orderData);
      await loadItemsIngredients(orderData);
    }
    setLoading(false);
  };

  const loadItemsIngredients = async (orderData: KitchenOrder) => {
    if (!catalog || !catalog.ingredients) {
      return;
    }

    try {
      const itemsDetails = await Promise.all(
        orderData.items.map(async (item) => {
          let baseIngredients: IngredientDetail[] = [];
          let customIngredients: IngredientDetail[] = [];

          try {
            if (item.type === 'plate' && item.plateId) {
              baseIngredients = await getPlateBaseIngredients(item.plateId);
            }
          } catch (error) {
            console.error('Error loading base ingredients:', error);
            baseIngredients = [];
          }

          try {
            if (item.customIngredients && item.customIngredients.length > 0 && catalog) {
              customIngredients = getIngredientsDetails(catalog, item.customIngredients, true);
            }
          } catch (error) {
            console.error('Error loading custom ingredients:', error);
            customIngredients = [];
          }

          return {
            item,
            baseIngredients: baseIngredients || [],
            customIngredients: customIngredients || []
          };
        })
      );

      setItemsWithIngredients(itemsDetails);
    } catch (error) {
      console.error('❌ Error loading item ingredients:', error);
      setItemsWithIngredients([]);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!order || !employee) return;

    const statusLabels: { [key: string]: string } = {
      'preparing': 'Start Preparing',
      'ready': 'Mark as Ready',
      'delivered': 'Mark as Delivered',
      'on_hold': 'Put on Hold'
    };

    Alert.alert(
      'Update Order Status',
      `${statusLabels[newStatus] || 'Update'} this order?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'default',
          onPress: async () => {
            const success = await updateOrderStatus(order.id, newStatus, employee.id);
            if (success) {
              // Update local order state
              setOrder(prev => prev ? { ...prev, status: newStatus } : null);
              if (newStatus === 'delivered') {
                navigation.goBack();
              }
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'confirmed': return '#ffc107';
      case 'preparing': return '#007bff';
      case 'ready': return '#28a745';
      case 'on_hold': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getNextStatus = (currentStatus: string): string | null => {
    switch (currentStatus) {
      case 'confirmed': return 'preparing';
      case 'preparing': return 'ready';
      case 'ready': return 'delivered';
      default: return null;
    }
  };

  const formatTime = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.warn('Invalid date for formatTime:', dateString);
      return 'Invalid Date';
    }
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.warn('Invalid date for formatDate:', dateString);
      return 'Invalid Date';
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#ff6b35" />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Order not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const nextStatus = getNextStatus(order.status);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderId}>Order #{String(order.id || '').slice(-8)}</Text>
          <Text style={styles.orderTime}>🕐 {formatDate(order.createdAt)}</Text>
        </View>
        
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
          <Text style={styles.statusText}>{String(order.status || '').toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👤 Customer Information</Text>
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>{String(order.customer?.name || 'Unknown Customer')}</Text>
          <Text style={styles.customerEmail}>{String(order.customer?.email || 'No email')}</Text>
          {order.customer?.phone && (
            <Text style={styles.customerPhone}>📞 {String(order.customer.phone)}</Text>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⏰ Order Timeline</Text>
        <View style={styles.timeline}>
          <View style={styles.timelineItem}>
            <Text style={styles.timelineLabel}>Ordered:</Text>
            <Text style={styles.timelineValue}>{formatTime(order.createdAt)}</Text>
          </View>
          
          {order.estimatedReady && (
            <View style={styles.timelineItem}>
              <Text style={styles.timelineLabel}>Estimated Ready:</Text>
              <Text style={styles.timelineValue}>{formatTime(order.estimatedReady)}</Text>
            </View>
          )}
          
          {order.actualReady && (
            <View style={styles.timelineItem}>
              <Text style={styles.timelineLabel}>Completed:</Text>
              <Text style={styles.timelineValue}>{formatTime(order.actualReady)}</Text>
            </View>
          )}
          
          {order.preparationTime && (
            <View style={styles.timelineItem}>
              <Text style={styles.timelineLabel}>Prep Time:</Text>
              <Text style={styles.timelineValue}>{String(order.preparationTime || 0)}m</Text>
            </View>
          )}
          
          <View style={styles.timelineItem}>
            <Text style={styles.timelineLabel}>Age:</Text>
            <Text style={[styles.timelineValue, order.isUrgent && styles.urgentText]}>
              {String(order.orderAge || 0)}m {order.isUrgent && '🚨'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📦 Order Items ({String(order.items?.length || 0)})</Text>
        
        {itemsWithIngredients.map((itemDetail, index) => {
          const { item, baseIngredients, customIngredients } = itemDetail;
          const hasCustomIngredients = customIngredients && customIngredients.length > 0;
          
          // Safety check for item data
          if (!item || typeof item !== 'object') {
            console.warn(`⚠️ Invalid item data at index ${index}:`, item);
            return null;
          }
          
          return (
            <View key={index} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>
                    {String(item.name || (item.plateId ? 
                      catalog?.plates.find(p => p.id === item.plateId)?.name || 'Unknown Plate' : 
                      'Custom Creation'))}
                  </Text>
                  <Text style={styles.itemType}>
                    {item.type === 'plate' ? '🍽️ Menu Plate' : '🥗 Custom Creation'}
                  </Text>
                  <Text style={styles.itemQuantity}>Quantity: {String(item.quantity || 0)}</Text>
                </View>
                <View style={styles.itemPricing}>
                  <Text style={styles.itemPrice}>
                    {formatPrice(Number(item.price || 0))} each
                  </Text>
                  <Text style={styles.itemTotal}>
                    Total: {formatPrice(Number(item.price || 0) * Number(item.quantity || 0))}
                  </Text>
                </View>
              </View>

              {baseIngredients && baseIngredients.length > 0 && (
                <View style={styles.ingredientsContainer}>
                  <IngredientsList
                    title="🧾 Required Ingredients"
                    ingredients={baseIngredients}
                    showPrices={false}
                  />
                </View>
              )}

              {hasCustomIngredients && (
                <View style={styles.ingredientsContainer}>
                  <IngredientsList
                    title="➕ Extra Ingredients"
                    ingredients={customIngredients || []}
                    showPrices={false}
                  />
                </View>
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💰 Order Summary</Text>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Amount:</Text>
          <Text style={styles.totalValue}>{formatPrice(Number(order.totalPrice || 0))}</Text>
        </View>
        <Text style={styles.paymentInfo}>
          💳 Paid via {String(order.paymentMethod || 'Card')}
        </Text>
      </View>

      {order.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Special Instructions</Text>
          <View style={styles.notesContainer}>
            <Text style={styles.notesText}>{String(order.notes)}</Text>
          </View>
        </View>
      )}

      <View style={styles.actionButtons}>
        {nextStatus && order.status !== 'delivered' && (
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: getStatusColor(nextStatus) }]}
            onPress={() => handleStatusUpdate(nextStatus)}
            disabled={isUpdatingStatus}
          >
            <Text style={styles.primaryButtonText}>
              {isUpdatingStatus ? 'Updating...' : (
                nextStatus === 'preparing' ? '🍳 Start Cooking' :
                nextStatus === 'ready' ? '✅ Mark Ready' :
                nextStatus === 'delivered' ? '🚚 Mark Delivered' : 
                `Update to ${nextStatus}`
              )}
            </Text>
          </TouchableOpacity>
        )}

        {order.status !== 'on_hold' && order.status !== 'delivered' && (
          <TouchableOpacity
            style={styles.holdButton}
            onPress={() => handleStatusUpdate('on_hold')}
            disabled={isUpdatingStatus}
          >
            <Text style={styles.holdButtonText}>⏸️ Put on Hold</Text>
          </TouchableOpacity>
        )}

        {order.status === 'on_hold' && (
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: '#007bff' }]}
            onPress={() => handleStatusUpdate('confirmed')}
            disabled={isUpdatingStatus}
          >
            <Text style={styles.primaryButtonText}>▶️ Resume Order</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back to Dashboard</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f4e6',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff6b35',
    marginBottom: 4,
  },
  orderTime: {
    fontSize: 16,
    color: '#6c757d',
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#5d4e37',
    marginBottom: 12,
  },
  customerInfo: {
    backgroundColor: '#fff3cd',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 4,
  },
  customerEmail: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 2,
  },
  customerPhone: {
    fontSize: 14,
    color: '#856404',
  },
  timeline: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timelineLabel: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  timelineValue: {
    fontSize: 14,
    color: '#5d4e37',
    fontWeight: '600',
  },
  urgentText: {
    color: '#dc3545',
  },
  itemCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#5d4e37',
    marginBottom: 4,
  },
  itemType: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#ff6b35',
    fontWeight: '600',
  },
  itemPricing: {
    alignItems: 'flex-end',
  },
  itemPrice: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#5d4e37',
  },
  ingredientsContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#856404',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ff6b35',
  },
  paymentInfo: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
  },
  notesContainer: {
    backgroundColor: '#fff3cd',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  notesText: {
    fontSize: 16,
    color: '#856404',
    lineHeight: 24,
  },
  actionButtons: {
    padding: 20,
    gap: 12,
  },
  primaryButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  holdButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#dc3545',
    alignItems: 'center',
  },
  holdButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc3545',
  },
  backButton: {
    padding: 16,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '500',
  },
  loadingText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 12,
  },
  errorText: {
    fontSize: 18,
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 20,
  },
  bottomSpacing: {
    height: 20,
  },
});

export default OrderDetailScreen;