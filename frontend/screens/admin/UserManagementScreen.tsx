import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  TextInput, 
  Alert,
  RefreshControl
} from 'react-native';
import { useAdminStore, AdminUser } from '../../stores/adminStore';
import { Button } from '../../components/ui/Button';

const UserManagementScreen: React.FC = () => {
  const {
    users,
    usersPagination,
    adminUser,
    isLoading,
    error,
    fetchUsers,
    updateUserRole,
    clearError,
  } = useAdminStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (adminUser) {
      loadUsers();
    }
  }, [adminUser]);

  const loadUsers = async (page = 1) => {
    const filters: any = {};
    
    if (searchQuery.trim()) {
      filters.search = searchQuery.trim();
    }
    
    if (selectedRole !== 'all') {
      filters.role = selectedRole;
    }

    await fetchUsers(page, filters);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const handleSearch = () => {
    loadUsers(1);
  };

  const handleUpdateRole = (user: AdminUser, newRole: string) => {
    Alert.alert(
      'Update User Role',
      `Change ${user.name}'s role from ${user.role} to ${newRole}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            const success = await updateUserRole(user.id, newRole);
            if (success) {
              loadUsers();
            }
          },
        },
      ]
    );
  };

  const UserCard = ({ user }: { user: AdminUser }) => {
    const getRoleColor = (role: string) => {
      switch (role) {
        case 'admin': return '#EF4444';
        case 'employee': return '#F59E0B';
        case 'customer': return '#10B981';
        default: return '#6B7280';
      }
    };

    const getRoleEmoji = (role: string) => {
      switch (role) {
        case 'admin': return '👑';
        case 'employee': return '👨‍🍳';
        case 'customer': return '👤';
        default: return '❓';
      }
    };

    return (
      <View style={styles.userCard}>
        <View style={styles.cardHeader}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            {user.phone && (
              <Text style={styles.userPhone}>📞 {user.phone}</Text>
            )}
          </View>
          <View style={styles.userStats}>
            <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) }]}>
              <Text style={styles.roleText}>
                {getRoleEmoji(user.role)} {user.role.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user.totalOrders}</Text>
              <Text style={styles.statLabel}>Orders</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>${user.totalRevenue.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Revenue</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {new Date(user.createdAt).toLocaleDateString()}
              </Text>
              <Text style={styles.statLabel}>Joined</Text>
            </View>
          </View>
        </View>

        {user.role !== 'admin' && (
          <View style={styles.cardActions}>
            <Text style={styles.actionsLabel}>Change Role:</Text>
            <View style={styles.roleActions}>
              {user.role !== 'customer' && (
                <TouchableOpacity
                  style={[styles.roleButton, styles.customerButton]}
                  onPress={() => handleUpdateRole(user, 'customer')}
                >
                  <Text style={styles.roleButtonText}>👤 Customer</Text>
                </TouchableOpacity>
              )}
              
              {user.role !== 'employee' && (
                <TouchableOpacity
                  style={[styles.roleButton, styles.employeeButton]}
                  onPress={() => handleUpdateRole(user, 'employee')}
                >
                  <Text style={styles.roleButtonText}>👨‍🍳 Employee</Text>
                </TouchableOpacity>
              )}
              
              {user.role !== 'admin' && (
                <TouchableOpacity
                  style={[styles.roleButton, styles.adminButton]}
                  onPress={() => handleUpdateRole(user, 'admin')}
                >
                  <Text style={styles.roleButtonText}>👑 Admin</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>❌ {error}</Text>
        <Button title="Retry" onPress={() => { clearError(); loadUsers(); }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search and Filters */}
      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
          <Button
            title="🔍"
            onPress={handleSearch}
            style={styles.searchButton}
          />
        </View>

        <View style={styles.filterRow}>
          {['all', 'customer', 'employee', 'admin'].map((role) => (
            <TouchableOpacity
              key={role}
              style={[styles.filterButton, selectedRole === role && styles.filterButtonActive]}
              onPress={() => setSelectedRole(role)}
            >
              <Text style={[styles.filterText, selectedRole === role && styles.filterTextActive]}>
                {role === 'all' ? 'All' : role.charAt(0).toUpperCase() + role.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Users List */}
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <UserCard user={item} />}
        style={styles.usersList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {isLoading ? 'Loading users...' : 'No users found'}
            </Text>
          </View>
        }
      />

      {/* Pagination */}
      {usersPagination.total > 0 && (
        <View style={styles.pagination}>
          <Button
            title="◀️ Previous"
            onPress={() => loadUsers(usersPagination.page - 1)}
            disabled={!usersPagination.hasPrev || isLoading}
            style={styles.paginationButton}
          />
          
          <Text style={styles.paginationText}>
            Page {usersPagination.page} of {Math.ceil(usersPagination.total / usersPagination.limit)}
          </Text>
          
          <Button
            title="Next ▶️"
            onPress={() => loadUsers(usersPagination.page + 1)}
            disabled={!usersPagination.hasNext || isLoading}
            style={styles.paginationButton}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  searchButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#4F46E5',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  usersList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
    marginRight: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  userStats: {
    alignItems: 'flex-end',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 10,
  },
  cardBody: {
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  cardActions: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  actionsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  roleActions: {
    flexDirection: 'row',
    gap: 8,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  customerButton: {
    backgroundColor: '#10B981',
  },
  employeeButton: {
    backgroundColor: '#F59E0B',
  },
  adminButton: {
    backgroundColor: '#EF4444',
  },
  roleButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  paginationButton: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  paginationText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
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

export default UserManagementScreen;