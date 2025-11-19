import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { useEmployeeStore } from '../../stores/employeeStore';
import { useConfigStore } from '../../stores/configStore';
import { useCatalogStore } from '../../stores/catalogStore';
import type { KitchenOrder } from '../../stores/employeeStore';

interface OrdersDashboardScreenProps {
  navigation: any;
}

const { width } = Dimensions.get('window');
const isTablet = width > 768;

const OrdersDashboardScreen: React.FC<OrdersDashboardScreenProps> = ({ navigation }) => {
  const {
    employee,
    activeOrders,
    dashboardSummary,
    isLoading,
    isUpdatingStatus,
    error,
    fetchActiveOrders,
    fetchDashboardSummary,
    updateOrderStatus,
    logout,
    clearError,
  } = useEmployeeStore();

  const { config } = useConfigStore();
  const { catalog } = useCatalogStore();
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (employee) {
      loadDashboard();
      // Auto-refresh every 30 seconds
      const interval = setInterval(loadDashboard, 30000);
      return () => clearInterval(interval);
    }
  }, [employee]);

  const loadDashboard = useCallback(async () => {
    await fetchActiveOrders();
    await fetchDashboardSummary();
  }, [fetchActiveOrders, fetchDashboardSummary]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  }, [loadDashboard]);

  const handleStatusUpdate = useCallback(async (orderId: string, newStatus: string) => {
    const order = activeOrders.find(o => o.id === orderId);
    if (!order) return;

    const statusLabels: { [key: string]: string } = {
      'preparing': 'Start Preparing',
      'ready': 'Mark as Ready',
      'delivered': 'Mark as Delivered',
      'on_hold': 'Put on Hold'
    };

    Alert.alert(
      'Update Order Status',
      `${statusLabels[newStatus] || 'Update'} order from ${order.customer?.name || 'Unknown Customer'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'default',
          onPress: async () => {
            await updateOrderStatus(orderId, newStatus, employee?.id);
          }
        }
      ]
    );
  }, [activeOrders, updateOrderStatus, employee]);

  const getFilteredOrders = useCallback(() => {
    if (selectedFilter === 'all') return activeOrders;
    return activeOrders.filter(order => order.status === selectedFilter);
  }, [activeOrders, selectedFilter]);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'confirmed': return '#ffc107'; // Yellow
      case 'preparing': return '#007bff'; // Blue  
      case 'ready': return '#28a745'; // Green
      case 'on_hold': return '#dc3545'; // Red
      default: return '#6c757d'; // Gray
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

  const formatTime = (dateString: string): string => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderOrderCard = ({ item: order }: { item: KitchenOrder }) => {
    const nextStatus = getNextStatus(order.status);
    const canUpdate = nextStatus && !isUpdatingStatus;

    return (
      <TouchableOpacity
        style={[
          styles.orderCard,
          order.isUrgent && styles.urgentCard,
          { borderLeftColor: getStatusColor(order.status) }
        ]}
        onPress={() => navigation.navigate('OrderDetail', { orderId: order.id })}
      >
        {/* Order Header */}
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderId}>#{order.id.slice(-6)}</Text>
            <Text style={styles.customerName}>👤 {order.customer?.name || 'Unknown Customer'}</Text>
          </View>
          <View style={styles.timeInfo}>
            <Text style={styles.orderTime}>🕐 {formatTime(order.createdAt)}</Text>
            <Text style={[styles.orderAge, order.isUrgent && styles.urgentText]}>
              {String(order.orderAge || 0)}m ago
            </Text>
          </View>
        </View>

        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
          <Text style={styles.statusText}>{String(order.status || '').toUpperCase()}</Text>
        </View>

        {/* Order Items Preview */}
        <View style={styles.itemsPreview}>
          <Text style={styles.itemsTitle}>📦 Items ({String(order.items?.length || 0)}):</Text>
          {order.items.slice(0, 2).map((item, index) => (
            <Text key={index} style={styles.itemText}>
              • {String(item.name || (item.plateId ? 
                catalog?.plates.find(p => p.id === item.plateId)?.name || 'Unknown Plate' : 
                'Custom Creation'))} x{String(item.quantity || 0)}
            </Text>
          ))}
          {order.items.length > 2 && (
            <Text style={styles.moreItems}>+{String((order.items?.length || 0) - 2)} more items</Text>
          )}
        </View>

        {/* Preparation Info */}
        <View style={styles.prepInfo}>
          <Text style={styles.prepTime}>
            ⏱️ Est. prep: {String(order.estimatedPrepTime || 0)}m
          </Text>
          {order.priority !== 'normal' && (
            <Text style={[styles.priority, styles.highPriority]}>
              🔥 HIGH PRIORITY
            </Text>
          )}
        </View>

        {/* Action Button */}
        {canUpdate && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: getStatusColor(nextStatus) }]}
            onPress={() => handleStatusUpdate(order.id, nextStatus)}
            disabled={isUpdatingStatus}
          >
            <Text style={styles.actionButtonText}>
              {nextStatus === 'preparing' && '🍳 Start Cooking'}
              {nextStatus === 'ready' && '✅ Mark Ready'}
              {nextStatus === 'delivered' && '🚚 Delivered'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Hold Button */}
        {order.status !== 'on_hold' && (
          <TouchableOpacity
            style={styles.holdButton}
            onPress={() => handleStatusUpdate(order.id, 'on_hold')}
          >
            <Text style={styles.holdButtonText}>⏸️ Hold</Text>
          </TouchableOpacity>
        )}

        {/* Special Notes */}
        {order.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesTitle}>📝 Notes:</Text>
            <Text style={styles.notesText}>{String(order.notes)}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Welcome & Summary */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>👋 Welcome, {String(employee?.name || 'Employee')}</Text>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
      {/* Dashboard Summary */}
      {dashboardSummary && (
        <View style={styles.summarySection}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{String(dashboardSummary.queue?.pending || 0)}</Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{String(dashboardSummary.queue?.preparing || 0)}</Text>
            <Text style={styles.summaryLabel}>Cooking</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{String(dashboardSummary.queue?.ready || 0)}</Text>
            <Text style={styles.summaryLabel}>Ready</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{String(dashboardSummary.today?.completed || 0)}</Text>
            <Text style={styles.summaryLabel}>Completed</Text>
          </View>
        </View>
      )}

      {/* Filter Tabs */}
      <View style={styles.filterSection}>
        {['all', 'confirmed', 'preparing', 'ready'].map(filter => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterTab,
              selectedFilter === filter && styles.filterTabActive
            ]}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text style={[
              styles.filterText,
              selectedFilter === filter && styles.filterTextActive
            ]}>
              {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (!employee) {
    return (
      <View style={styles.center}>
        <Text>Please login first</Text>
      </View>
    );
  }

  const filteredOrders = getFilteredOrders();

  return (
    <View style={styles.container}>
      <FlatList
        ListHeaderComponent={renderHeader}
        data={filteredOrders}
        renderItem={renderOrderCard}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[config?.theme?.primaryColor || '#ff6b35']}
          />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {isLoading ? '⏳ Loading orders...' : '🎉 No orders in this filter!'}
            </Text>
          </View>
        }
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={21}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f4e6',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: 'white',
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#5d4e37',
  },
  logoutButton: {
    padding: 8,
    backgroundColor: '#dc3545',
    borderRadius: 8,
  },
  logoutText: {
    color: 'white',
    fontWeight: '600',
  },
  summarySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff6b35',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#5d4e37',
    fontWeight: '500',
  },
  filterSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f1f3f4',
  },
  filterTabActive: {
    backgroundColor: '#ff6b35',
  },
  filterText: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  filterTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  urgentCard: {
    borderColor: '#dc3545',
    backgroundColor: '#fff5f5',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff6b35',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 16,
    color: '#5d4e37',
    fontWeight: '500',
  },
  timeInfo: {
    alignItems: 'flex-end',
  },
  orderTime: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 2,
  },
  orderAge: {
    fontSize: 12,
    color: '#6c757d',
  },
  urgentText: {
    color: '#dc3545',
    fontWeight: 'bold',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  itemsPreview: {
    marginBottom: 12,
  },
  itemsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5d4e37',
    marginBottom: 6,
  },
  itemText: {
    fontSize: 13,
    color: '#6c757d',
    marginBottom: 2,
  },
  moreItems: {
    fontSize: 12,
    color: '#ff6b35',
    fontStyle: 'italic',
  },
  prepInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  prepTime: {
    fontSize: 13,
    color: '#5d4e37',
    fontWeight: '500',
  },
  priority: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  highPriority: {
    color: '#dc3545',
  },
  actionButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  holdButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dc3545',
    alignItems: 'center',
    marginBottom: 8,
  },
  holdButtonText: {
    color: '#dc3545',
    fontSize: 12,
    fontWeight: '500',
  },
  notesContainer: {
    backgroundColor: '#fff3cd',
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#ffc107',
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 12,
    color: '#856404',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
});

export default OrdersDashboardScreen;