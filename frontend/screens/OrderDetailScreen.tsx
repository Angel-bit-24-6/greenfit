import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useOrderStore } from '../stores/orderStore';
import { useConfigStore } from '../stores/configStore';
import { useCatalogStore } from '../stores/catalogStore';
import { useCartStore } from '../stores/cartStore';
import { ToastManager } from '../utils/ToastManager';
import { IngredientsList } from '../components/IngredientsList';
import { 
  getPlateBaseIngredients, 
  getIngredientsDetails,
  formatPrice 
} from '../utils/catalogHelpers';
import type { Order } from '../stores/orderStore';
import type { IngredientDetail } from '../types/domain';

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
  const { getOrder } = useOrderStore();
  const { config } = useConfigStore();
  const { catalog } = useCatalogStore();
  const { addItem } = useCartStore();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemsWithIngredients, setItemsWithIngredients] = useState<Array<{
    item: any;
    baseIngredients: IngredientDetail[];
    customIngredients: IngredientDetail[];
  }>>([]);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const orderData = await getOrder(orderId);
      if (orderData) {
        setOrder(orderData);
        await loadItemsIngredients(orderData);
      } else {
        setError('Order not found');
      }
    } catch (err) {
      console.error('Error loading order:', err);
      setError('Failed to load order details');
      ToastManager.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const loadItemsIngredients = async (orderData: Order) => {
    if (!catalog) return;

    const itemsDetails = await Promise.all(
      orderData.items.map(async (item) => {
        let baseIngredients: IngredientDetail[] = [];
        let customIngredients: IngredientDetail[] = [];

        if (item.type === 'plate' && item.plateId) {
          // Get base ingredients from the plate
          baseIngredients = await getPlateBaseIngredients(item.plateId);
        }

        if (item.customIngredients && item.customIngredients.length > 0) {
          // Get custom ingredients details
          customIngredients = getIngredientsDetails(catalog, item.customIngredients, true);
        }

        return {
          item,
          baseIngredients,
          customIngredients
        };
      })
    );

    setItemsWithIngredients(itemsDetails);
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
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleReorder = () => {
    Alert.alert(
      'Reorder Items',
      'Would you like to add these items to your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Yes, Reorder', 
          onPress: async () => {
            await addItemsToCart();
          }
        },
      ]
    );
  };

  const addItemsToCart = async () => {
    if (!order || !order.items || order.items.length === 0) {
      ToastManager.error('No items to reorder');
      return;
    }

    try {
      setLoading(true);
      let successCount = 0;
      let failedItems = [];

      for (const orderItem of order.items) {
        // Prepare cart item format
        const cartItem = {
          type: orderItem.type as 'plate' | 'custom',
          name: orderItem.name,
          price: orderItem.price,
          quantity: orderItem.quantity,
          plateId: orderItem.plateId || undefined,
          customIngredients: orderItem.customIngredients || undefined,
        };

        // Try to add each item to cart
        const success = await addItem(cartItem);
        
        if (success) {
          successCount++;
        } else {
          failedItems.push(orderItem.name);
        }
      }

      if (successCount > 0 && failedItems.length === 0) {
        // All items added successfully
        ToastManager.success(`${successCount} items added to cart!`);
        navigation.navigate('Main', { screen: 'CartTab' });
      } else if (successCount > 0 && failedItems.length > 0) {
        // Some items added, some failed
        ToastManager.warning(
          `${successCount} items added. ${failedItems.length} items unavailable: ${failedItems.join(', ')}`
        );
        navigation.navigate('Main', { screen: 'CartTab' });
      } else {
        // No items could be added
        ToastManager.error(`Could not add items to cart. Unavailable: ${failedItems.join(', ')}`);
      }
    } catch (error) {
      console.error('Error adding items to cart:', error);
      ToastManager.error('Failed to add items to cart');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={config?.theme?.primaryColor || '#16a34a'} />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>Oops!</Text>
        <Text style={styles.errorText}>{error || 'Order not found'}</Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: config?.theme?.primaryColor || '#16a34a' }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Order Header */}
      <View style={styles.header}>
        <Text style={styles.orderId}>Order #{String(order.id || '').slice(-8)}</Text>
        <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
      </View>

      {/* Status Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status</Text>
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
            <Text style={styles.statusText}>{String(order.status || '').toUpperCase()}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getPaymentStatusColor(order.paymentStatus) }]}>
            <Text style={styles.statusText}>
              {order.paymentStatus === 'completed' ? 'PAID' : String(order.paymentStatus || '').toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      {/* Items Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Items</Text>
        {itemsWithIngredients.map((itemDetail, index) => {
          const { item, baseIngredients, customIngredients } = itemDetail;
          const hasCustomIngredients = customIngredients.length > 0;
          const customSubtotal = customIngredients.reduce((total, ing) => total + (ing.price * ing.quantity), 0);
          
          return (
            <View key={`order-item-${index}-${item.id}`} style={styles.itemCard}>
              {/* Item Header */}
              <View style={styles.itemHeader}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{String(item.name || 'Unknown Item')}</Text>
                  <Text style={styles.itemType}>
                    {item.type === 'plate' ? '🍽️ Menu Plate' : '🥗 Custom Creation'}
                  </Text>
                  <Text style={styles.itemQuantity}>Quantity: {String(item.quantity || 0)}</Text>
                </View>
                <View style={styles.itemPricing}>
                  <Text style={styles.itemPrice}>
                    {item.type === 'plate' ? 'Base Price:' : 'Total:'} {formatPrice(Number(item.price || 0))}
                  </Text>
                  <Text style={styles.itemTotal}>
                    Total: {formatPrice(Number(item.price || 0) * Number(item.quantity || 0))}
                  </Text>
                </View>
              </View>

              {/* Base Ingredients (for plates) */}
              {baseIngredients.length > 0 && (
                <View style={styles.ingredientsContainer}>
                  <IngredientsList
                    title="Included Ingredients"
                    ingredients={baseIngredients}
                    showPrices={false}
                  />
                </View>
              )}

              {/* Custom Ingredients (with prices) */}
              {hasCustomIngredients && (
                <View style={styles.ingredientsContainer}>
                  <IngredientsList
                    title="Extra Ingredients"
                    ingredients={customIngredients}
                    showPrices={true}
                    showSubtotal={true}
                  />
                </View>
              )}

              {/* Price Breakdown for Custom Plates */}
              {item.type === 'custom' && (
                <View style={styles.priceBreakdown}>
                  <Text style={styles.breakdownNote}>
                    * Custom creation price includes all selected ingredients
                  </Text>
                </View>
              )}

              {/* Price Breakdown for Plates with Extras */}
              {item.type === 'plate' && hasCustomIngredients && (
                <View style={styles.priceBreakdown}>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Base plate:</Text>
                    <Text style={styles.breakdownValue}>
                      {formatPrice(item.price - customSubtotal)}
                    </Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Extra ingredients:</Text>
                    <Text style={styles.breakdownValue}>
                      {formatPrice(customSubtotal)}
                    </Text>
                  </View>
                  <View style={[styles.breakdownRow, styles.breakdownTotal]}>
                    <Text style={styles.breakdownTotalLabel}>Item total:</Text>
                    <Text style={styles.breakdownTotalValue}>
                      {formatPrice(item.price)}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Order Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Items Total:</Text>
          <Text style={styles.summaryValue}>${Number(order.totalPrice || 0).toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tax:</Text>
          <Text style={styles.summaryValue}>$0.00</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Delivery:</Text>
          <Text style={styles.summaryValue}>$0.00</Text>
        </View>
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalValue}>${Number(order.totalPrice || 0).toFixed(2)}</Text>
        </View>
      </View>

      {/* Payment Info */}
      {order.paymentMethod && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Information</Text>
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentMethod}>
              Method: {String(order.paymentMethod) === 'stripe_test' ? 'Card (Test)' : 'Card'}
            </Text>
            {order.paymentId && (
              <Text style={styles.paymentId}>
                Payment ID: {String(order.paymentId || '').slice(-8)}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Notes */}
      {order.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Special Instructions</Text>
          <Text style={styles.notesText}>{String(order.notes)}</Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {order.status === 'delivered' && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: config?.theme?.primaryColor || '#16a34a' }]}
            onPress={handleReorder}
          >
            <Text style={styles.buttonText}>Reorder These Items</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[styles.button, styles.outlineButton]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.buttonText, styles.outlineButtonText]}>Back to Orders</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
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
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  orderId: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 16,
    color: '#6b7280',
  },
  section: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  itemCard: {
    marginBottom: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  itemType: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  itemPricing: {
    alignItems: 'flex-end',
  },
  itemPrice: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  ingredientsContainer: {
    backgroundColor: 'white',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  priceBreakdown: {
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  breakdownValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  breakdownTotal: {
    borderTopWidth: 1,
    borderTopColor: '#d1d5db',
    marginTop: 8,
    paddingTop: 8,
  },
  breakdownTotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  breakdownTotalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  breakdownNote: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 16,
    color: '#111827',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 8,
    paddingTop: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  paymentInfo: {
    gap: 8,
  },
  paymentMethod: {
    fontSize: 16,
    color: '#111827',
  },
  paymentId: {
    fontSize: 14,
    color: '#6b7280',
  },
  notesText: {
    fontSize: 16,
    color: '#111827',
    lineHeight: 24,
  },
  actionButtons: {
    padding: 20,
    gap: 12,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  outlineButtonText: {
    color: '#374151',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  bottomSpacing: {
    height: 20,
  },
});

export default OrderDetailScreen;