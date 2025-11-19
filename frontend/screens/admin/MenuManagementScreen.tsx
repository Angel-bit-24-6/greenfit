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
import { useAdminStore, AdminPlate } from '../../stores/adminStore';
import { Button } from '../../components/ui/Button';
import { useNavigation } from '@react-navigation/native';

const MenuManagementScreen: React.FC = () => {
  const navigation = useNavigation();
  const {
    plates,
    platesPagination,
    adminUser,
    isLoading,
    error,
    fetchPlates,
    deletePlate,
    clearError,
  } = useAdminStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAvailability, setSelectedAvailability] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (adminUser) {
      loadPlates();
    }
  }, [adminUser]);

  const loadPlates = async (page = 1) => {
    const filters: any = {};
    
    if (searchQuery.trim()) {
      filters.search = searchQuery.trim();
    }
    
    if (selectedAvailability !== 'all') {
      filters.available = selectedAvailability === 'available';
    }

    await fetchPlates(page, filters);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPlates();
    setRefreshing(false);
  };

  const handleSearch = () => {
    loadPlates(1);
  };

  const handleDeletePlate = (plate: AdminPlate) => {
    Alert.alert(
      'Delete Plate',
      `Are you sure you want to delete "${plate.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deletePlate(plate.id);
            if (success) {
              loadPlates();
            }
          },
        },
      ]
    );
  };

  const PlateCard = ({ plate }: { plate: AdminPlate }) => {
    return (
      <View style={styles.plateCard}>
        <View style={styles.cardHeader}>
          <View style={styles.plateInfo}>
            <Text style={styles.plateName}>{plate.name}</Text>
            <Text style={styles.plateDescription}>{plate.description}</Text>
          </View>
          <View style={styles.plateStats}>
            <Text style={styles.priceText}>${plate.price?.toFixed(2) || '0.00'}</Text>
            {plate.preparationTime && (
              <Text style={styles.prepTimeText}>⏱️ {plate.preparationTime}min</Text>
            )}
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { 
              backgroundColor: plate.available ? '#D1FAE5' : '#FEE2E2' 
            }]}>
              <Text style={[styles.statusText, { 
                color: plate.available ? '#065F46' : '#991B1B' 
              }]}>
                {plate.available ? '✅ Available' : '❌ Unavailable'}
              </Text>
            </View>
            
            {plate.tags.length > 0 && (
              <View style={styles.tagsList}>
                {plate.tags.slice(0, 3).map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
                {plate.tags.length > 3 && (
                  <Text style={styles.moreTagsText}>+{plate.tags.length - 3}</Text>
                )}
              </View>
            )}
          </View>

          <View style={styles.ingredientsContainer}>
            <Text style={styles.ingredientsLabel}>Ingredients ({plate.ingredients.length}):</Text>
            <Text style={styles.ingredientsText}>
              {plate.ingredients.slice(0, 3).map(pi => pi.ingredient.name).join(', ')}
              {plate.ingredients.length > 3 && ` +${plate.ingredients.length - 3} more`}
            </Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.viewButton]}
            onPress={() => navigation.navigate('PlateDetail', { 
              plateId: plate.id, 
              mode: 'view' 
            })}
          >
            <Text style={styles.viewButtonText}>👁️ View</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => navigation.navigate('PlateDetail', { 
              plateId: plate.id, 
              mode: 'edit' 
            })}
          >
            <Text style={styles.editButtonText}>✏️ Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeletePlate(plate)}
          >
            <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>❌ {error}</Text>
        <Button title="Retry" onPress={() => { clearError(); loadPlates(); }} />
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
            placeholder="Search plates..."
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
          <TouchableOpacity
            style={[styles.filterButton, selectedAvailability === 'all' && styles.filterButtonActive]}
            onPress={() => setSelectedAvailability('all')}
          >
            <Text style={[styles.filterText, selectedAvailability === 'all' && styles.filterTextActive]}>
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, selectedAvailability === 'available' && styles.filterButtonActive]}
            onPress={() => setSelectedAvailability('available')}
          >
            <Text style={[styles.filterText, selectedAvailability === 'available' && styles.filterTextActive]}>
              Available
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, selectedAvailability === 'unavailable' && styles.filterButtonActive]}
            onPress={() => setSelectedAvailability('unavailable')}
          >
            <Text style={[styles.filterText, selectedAvailability === 'unavailable' && styles.filterTextActive]}>
              Unavailable
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Add New Plate Button */}
      <View style={styles.actionsContainer}>
        <Button
          title="➕ Add New Plate"
          onPress={() => navigation.navigate('PlateDetail', { mode: 'create' })}
          style={styles.addButton}
        />
      </View>

      {/* Plates List */}
      <FlatList
        data={plates}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PlateCard plate={item} />}
        style={styles.platesList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {isLoading ? 'Loading plates...' : 'No plates found'}
            </Text>
          </View>
        }
      />

      {/* Pagination */}
      {platesPagination.total > 0 && (
        <View style={styles.pagination}>
          <Button
            title="◀️ Previous"
            onPress={() => loadPlates(platesPagination.page - 1)}
            disabled={!platesPagination.hasPrev || isLoading}
            style={styles.paginationButton}
          />
          
          <Text style={styles.paginationText}>
            Page {platesPagination.page} of {Math.ceil(platesPagination.total / platesPagination.limit)}
          </Text>
          
          <Button
            title="Next ▶️"
            onPress={() => loadPlates(platesPagination.page + 1)}
            disabled={!platesPagination.hasNext || isLoading}
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
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#4F46E5',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  actionsContainer: {
    padding: 16,
  },
  addButton: {
    backgroundColor: '#10B981',
  },
  platesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  plateCard: {
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
  plateInfo: {
    flex: 1,
    marginRight: 12,
  },
  plateName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  plateDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
  },
  plateStats: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 4,
  },
  prepTimeText: {
    fontSize: 12,
    color: '#6B7280',
  },
  cardBody: {
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tagsList: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
  },
  tagText: {
    fontSize: 10,
    color: '#6B7280',
  },
  moreTagsText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  ingredientsContainer: {
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: 6,
  },
  ingredientsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  ingredientsText: {
    fontSize: 12,
    color: '#6B7280',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  viewButton: {
    backgroundColor: '#8B5CF6',
  },
  viewButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  editButton: {
    backgroundColor: '#3B82F6',
  },
  editButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
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

export default MenuManagementScreen;