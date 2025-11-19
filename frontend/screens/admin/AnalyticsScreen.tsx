import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useAdminStore } from '../../stores/adminStore';
import { Button } from '../../components/ui/Button';

const AnalyticsScreen: React.FC = () => {
  const {
    adminUser,
    isLoading,
    error,
    clearError,
  } = useAdminStore();

  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [refreshing, setRefreshing] = useState(false);

  // Mock analytics data - replace with real data from store
  const analyticsData = {
    sales: {
      totalRevenue: 2450.75,
      totalOrders: 89,
      avgOrderValue: 27.54,
      completionRate: 94.5,
      avgPrepTime: 18
    },
    inventory: {
      totalIngredients: 45,
      lowStock: 7,
      outOfStock: 2,
      mostUsed: [
        { name: 'Avocado', usage: 156 },
        { name: 'Quinoa', usage: 134 },
        { name: 'Spinach', usage: 128 }
      ]
    }
  };

  useEffect(() => {
    // Load analytics when component mounts
    if (adminUser) {
      loadAnalytics();
    }
  }, [adminUser, selectedPeriod]);

  const loadAnalytics = async () => {
    // TODO: Implement actual analytics loading
    // await fetchSalesAnalytics(selectedPeriod);
    // await fetchInventoryAnalytics();
    console.log('📊 Loading analytics for period:', selectedPeriod);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  const StatCard = ({ title, value, subtitle, color = '#4F46E5' }: {
    title: string;
    value: string | number;
    subtitle?: string;
    color?: string;
  }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  const ChartPlaceholder = ({ title, height = 200 }: { title: string; height?: number }) => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      <View style={[styles.chartPlaceholder, { height }]}>
        <Text style={styles.chartPlaceholderText}>📊</Text>
        <Text style={styles.chartPlaceholderSubtext}>Chart Coming Soon</Text>
      </View>
    </View>
  );

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>❌ {error}</Text>
        <Button title="Retry" onPress={() => { clearError(); loadAnalytics(); }} />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Period Selector */}
      <View style={styles.periodSelector}>
        <Text style={styles.sectionTitle}>📈 Analytics Period</Text>
        <View style={styles.periodButtons}>
          {[
            { key: '24h', label: '24 Hours' },
            { key: '7d', label: '7 Days' },
            { key: '30d', label: '30 Days' },
            { key: '90d', label: '90 Days' }
          ].map((period) => (
            <TouchableOpacity
              key={period.key}
              style={[
                styles.periodButton,
                selectedPeriod === period.key && styles.periodButtonActive
              ]}
              onPress={() => setSelectedPeriod(period.key)}
            >
              <Text style={[
                styles.periodButtonText,
                selectedPeriod === period.key && styles.periodButtonTextActive
              ]}>
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Sales Analytics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💰 Sales Analytics</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Total Revenue"
            value={`$${analyticsData.sales.totalRevenue.toFixed(2)}`}
            color="#10B981"
          />
          <StatCard
            title="Total Orders"
            value={analyticsData.sales.totalOrders}
            color="#3B82F6"
          />
          <StatCard
            title="Avg Order Value"
            value={`$${analyticsData.sales.avgOrderValue.toFixed(2)}`}
            color="#8B5CF6"
          />
          <StatCard
            title="Completion Rate"
            value={`${analyticsData.sales.completionRate}%`}
            color="#F59E0B"
          />
          <StatCard
            title="Avg Prep Time"
            value={`${analyticsData.sales.avgPrepTime}min`}
            color="#EF4444"
          />
        </View>
      </View>

      {/* Revenue Chart */}
      <View style={styles.section}>
        <ChartPlaceholder title="📈 Revenue Trend" />
      </View>

      {/* Inventory Analytics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📦 Inventory Analytics</Text>
        <View style={styles.statsRow}>
          <StatCard
            title="Total Ingredients"
            value={analyticsData.inventory.totalIngredients}
            color="#06B6D4"
          />
          <StatCard
            title="Low Stock"
            value={analyticsData.inventory.lowStock}
            color="#F59E0B"
          />
          <StatCard
            title="Out of Stock"
            value={analyticsData.inventory.outOfStock}
            color="#EF4444"
          />
        </View>
      </View>

      {/* Most Used Ingredients */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔥 Most Used Ingredients</Text>
        {analyticsData.inventory.mostUsed.map((ingredient, index) => (
          <View key={index} style={styles.ingredientUsageItem}>
            <View style={styles.ingredientUsageInfo}>
              <Text style={styles.ingredientUsageName}>{ingredient.name}</Text>
              <Text style={styles.ingredientUsageCount}>Used {ingredient.usage} times</Text>
            </View>
            <View style={styles.ingredientUsageBar}>
              <View style={[
                styles.ingredientUsageBarFill,
                { width: `${(ingredient.usage / 156) * 100}%` }
              ]} />
            </View>
          </View>
        ))}
      </View>

      {/* Order Status Chart */}
      <View style={styles.section}>
        <ChartPlaceholder title="📊 Order Status Distribution" height={150} />
      </View>

      {/* Peak Hours Chart */}
      <View style={styles.section}>
        <ChartPlaceholder title="🕐 Peak Order Hours" height={180} />
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.actionIcon}>📊</Text>
            <Text style={styles.actionTitle}>Export Data</Text>
            <Text style={styles.actionSubtitle}>Download analytics report</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.actionIcon}>📈</Text>
            <Text style={styles.actionTitle}>View Trends</Text>
            <Text style={styles.actionSubtitle}>Detailed trend analysis</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.actionIcon}>🎯</Text>
            <Text style={styles.actionTitle}>Set Goals</Text>
            <Text style={styles.actionSubtitle}>Configure targets</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  periodSelector: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  periodButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#4F46E5',
  },
  periodButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
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
  statsRow: {
    flexDirection: 'row',
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
    flex: 1,
  },
  statTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
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
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  chartPlaceholder: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  chartPlaceholderText: {
    fontSize: 32,
    marginBottom: 8,
  },
  chartPlaceholderSubtext: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  ingredientUsageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  ingredientUsageInfo: {
    flex: 1,
    marginRight: 12,
  },
  ingredientUsageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  ingredientUsageCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  ingredientUsageBar: {
    width: 100,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
  },
  ingredientUsageBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  bottomPadding: {
    height: 20,
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
});

export default AnalyticsScreen;