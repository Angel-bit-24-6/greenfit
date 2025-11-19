import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useAdminStore } from '../../stores/adminStore';
import { Button } from '../../components/ui/Button';
import { useNavigation } from '@react-navigation/native';

const AdminDashboardScreen: React.FC = () => {
  const navigation = useNavigation();
  const {
    systemOverview,
    adminUser,
    isLoading,
    error,
    fetchSystemOverview,
    clearError,
    logout,
  } = useAdminStore();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (adminUser) {
      fetchSystemOverview();
    }
  }, [adminUser]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSystemOverview();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.navigate('AdminLogin' as never);
          }
        },
      ]
    );
  };

  const StatCard = ({ title, value, icon, color = '#4F46E5', subtitle }: {
    title: string;
    value: number | string;
    icon: string;
    color?: string;
    subtitle?: string;
  }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Text style={styles.statIcon}>{icon}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  const AlertCard = ({ title, message, type = 'warning' }: {
    title: string;
    message: string;
    type?: 'warning' | 'error' | 'info';
  }) => {
    const alertColors = {
      warning: { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' },
      error: { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B' },
      info: { bg: '#DBEAFE', border: '#3B82F6', text: '#1E40AF' },
    };

    const colors = alertColors[type];

    return (
      <View style={[styles.alertCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
        <Text style={[styles.alertTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.alertMessage, { color: colors.text }]}>{message}</Text>
      </View>
    );
  };

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>❌ {error}</Text>
        <Button title="Retry" onPress={() => { clearError(); fetchSystemOverview(); }} />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome back! 👋</Text>
          <Text style={styles.adminName}>{adminUser?.name || 'Admin'}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>🚪 Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Alerts */}
      {systemOverview?.alerts && (
        <View style={styles.alertsSection}>
          {systemOverview.alerts.lowStock && (
            <AlertCard
              title="⚠️ Low Stock Alert"
              message={`${systemOverview.summary.lowStockIngredients} ingredients are running low`}
              type="warning"
            />
          )}
          {systemOverview.alerts.unavailablePlates && (
            <AlertCard
              title="🚫 Unavailable Plates"
              message={`${systemOverview.summary.unavailablePlates} plates are currently unavailable`}
              type="error"
            />
          )}
          {systemOverview.alerts.activeOrdersHigh && (
            <AlertCard
              title="🔥 High Order Volume"
              message={`${systemOverview.summary.activeOrders} active orders - Kitchen may be busy`}
              type="info"
            />
          )}
        </View>
      )}

      {/* System Overview Stats */}
      {systemOverview && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 System Overview</Text>
            <View style={styles.statsGrid}>
              <StatCard
                title="Total Users"
                value={systemOverview.summary.totalUsers}
                icon="👥"
                color="#10B981"
              />
              <StatCard
                title="Active Orders"
                value={systemOverview.summary.activeOrders}
                icon="🔥"
                color="#F59E0B"
              />
              <StatCard
                title="Ingredients"
                value={systemOverview.summary.totalIngredients}
                icon="📦"
                color="#8B5CF6"
              />
              <StatCard
                title="Plates"
                value={systemOverview.summary.totalPlates}
                icon="🍽️"
                color="#06B6D4"
              />
            </View>
          </View>

          {/* Today's Metrics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📈 Today's Metrics</Text>
            <View style={styles.statsGrid}>
              <StatCard
                title="Today's Orders"
                value={systemOverview.metrics.todayOrders}
                icon="📅"
                color="#EF4444"
              />
              <StatCard
                title="Week Orders"
                value={systemOverview.metrics.weekOrders}
                icon="📊"
                color="#3B82F6"
              />
              <StatCard
                title="Month Revenue"
                value={`$${systemOverview.metrics.monthRevenue.toFixed(2)}`}
                icon="💰"
                color="#10B981"
              />
            </View>
          </View>

          {/* Recent Activity */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🕒 Recent Activity</Text>
            {systemOverview.recentActivity.length > 0 ? (
              systemOverview.recentActivity.slice(0, 5).map((order, index) => (
                <View key={order.id} style={styles.activityItem}>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityCustomer}>{order.customerName}</Text>
                    <Text style={styles.activityDetails}>
                      ${order.totalPrice.toFixed(2)} • {order.status}
                    </Text>
                  </View>
                  <Text style={styles.activityTime}>
                    {new Date(order.createdAt).toLocaleTimeString()}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.noDataText}>No recent activity</Text>
            )}
          </View>
        </>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#8B5CF6' }]}
            onPress={() => navigation.navigate('Inventory' as never)}
          >
            <Text style={styles.actionIcon}>📦</Text>
            <Text style={styles.actionText}>Manage Inventory</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#06B6D4' }]}
            onPress={() => navigation.navigate('Menu' as never)}
          >
            <Text style={styles.actionIcon}>🍽️</Text>
            <Text style={styles.actionText}>Manage Menu</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#10B981' }]}
            onPress={() => navigation.navigate('Users' as never)}
          >
            <Text style={styles.actionIcon}>👥</Text>
            <Text style={styles.actionText}>Manage Users</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#F59E0B' }]}
            onPress={() => navigation.navigate('Analytics' as never)}
          >
            <Text style={styles.actionIcon}>📈</Text>
            <Text style={styles.actionText}>View Analytics</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  welcomeText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 4,
  },
  adminName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  logoutButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  alertsSection: {
    padding: 16,
    gap: 12,
  },
  alertCard: {
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 14,
  },
  section: {
    margin: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  statsGrid: {
    gap: 12,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  statTitle: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  activityInfo: {
    flex: 1,
  },
  activityCustomer: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  activityDetails: {
    fontSize: 14,
    color: '#6B7280',
  },
  activityTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  noDataText: {
    textAlign: 'center',
    color: '#6B7280',
    fontStyle: 'italic',
    padding: 20,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: 150,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionText: {
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#6B7280',
    fontStyle: 'italic',
  },
});

export default AdminDashboardScreen;