import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  TextInput, 
  Alert,
  RefreshControl,
  Modal
} from 'react-native';
import { useAdminStore, AdminIngredient } from '../../stores/adminStore';
import { Button } from '../../components/ui/Button';
import { useNavigation } from '@react-navigation/native';

const InventoryManagementScreen: React.FC = () => {
  const navigation = useNavigation();
  const {
    ingredients,
    ingredientsPagination,
    adminUser,
    isLoading,
    error,
    fetchIngredients,
    deleteIngredient,
    bulkUpdateStock,
    clearError,
  } = useAdminStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAvailability, setSelectedAvailability] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [bulkStockUpdates, setBulkStockUpdates] = useState<Record<string, string>>({});

  useEffect(() => {
    if (adminUser) {
      loadIngredients();
    }
  }, [adminUser]);

  const loadIngredients = async (page = 1) => {
    const filters: any = {};
    
    if (searchQuery.trim()) {
      filters.search = searchQuery.trim();
    }
    
    if (selectedAvailability !== 'all') {
      filters.available = selectedAvailability === 'available';
    }

    await fetchIngredients(page, filters);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadIngredients();
    setRefreshing(false);
  };

  const handleSearch = () => {
    loadIngredients(1);
  };

  const handleDeleteIngredient = (ingredient: AdminIngredient) => {
    Alert.alert(
      'Delete Ingredient',
      `Are you sure you want to delete "${ingredient.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteIngredient(ingredient.id);
            if (success) {
              loadIngredients();
            }
          },
        },
      ]
    );
  };

  const handleBulkStockUpdate = () => {
    const updates = Object.entries(bulkStockUpdates)
      .filter(([_, value]) => value.trim() !== '' && !isNaN(Number(value)))
      .map(([id, stock]) => ({ id, stock: parseInt(stock, 10) }));

    if (updates.length === 0) {
      Alert.alert('Error', 'Please enter valid stock numbers for at least one ingredient');
      return;
    }

    Alert.alert(
      'Bulk Update Stock',
      `Update stock for ${updates.length} ingredients?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            const success = await bulkUpdateStock(updates);
            if (success) {
              setBulkStockUpdates({});
              setShowStockModal(false);
              loadIngredients();
            }
          },
        },
      ]
    );
  };

  const IngredientCard = ({ ingredient }: { ingredient: AdminIngredient }) => {
    const stockLevel = ingredient.stock <= 5 ? 'low' : ingredient.stock <= 15 ? 'medium' : 'high';
    const stockColor = stockLevel === 'low' ? '#EF4444' : stockLevel === 'medium' ? '#F59E0B' : '#10B981';

    return (
      <View style={styles.ingredientCard}>
        <View style={styles.cardHeader}>
          <View style={styles.ingredientInfo}>
            <Text style={styles.ingredientName}>{ingredient.name}</Text>
            <Text style={styles.ingredientDescription}>
              {ingredient.description || 'No description'}
            </Text>
          </View>
          <View style={styles.ingredientStats}>
            <View style={[styles.stockBadge, { backgroundColor: stockColor }]}>
              <Text style={styles.stockText}>{ingredient.stock}</Text>
            </View>
            <Text style={styles.priceText}>${ingredient.price?.toFixed(2) || '0.00'}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.tagsContainer}>
            <View style={[styles.statusBadge, { 
              backgroundColor: ingredient.available ? '#D1FAE5' : '#FEE2E2' 
            }]}>
              <Text style={[styles.statusText, { 
                color: ingredient.available ? '#065F46' : '#991B1B' 
              }]}>
                {ingredient.available ? '✅ Available' : '❌ Unavailable'}
              </Text>
            </View>
            
            {ingredient.tags.length > 0 && (
              <View style={styles.tagsList}>
                {ingredient.tags.slice(0, 2).map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
                {ingredient.tags.length > 2 && (
                  <Text style={styles.moreTagsText}>+{ingredient.tags.length - 2}</Text>
                )}
              </View>
            )}
          </View>

          {ingredient.allergens.length > 0 && (
            <View style={styles.allergensContainer}>
              <Text style={styles.allergensLabel}>Allergens: </Text>
              <Text style={styles.allergensText}>{ingredient.allergens.join(', ')}</Text>
            </View>
          )}
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => navigation.navigate('IngredientDetail', { 
              ingredientId: ingredient.id, 
              mode: 'edit' 
            })}
          >
            <Text style={styles.editButtonText}>✏️ Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteIngredient(ingredient)}
          >
            <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const BulkStockModal = () => (
    <Modal visible={showStockModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>📦 Bulk Update Stock</Text>
          
          <FlatList
            data={ingredients}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.bulkStockItem}>
                <View style={styles.bulkStockInfo}>
                  <Text style={styles.bulkStockName}>{item.name}</Text>
                  <Text style={styles.bulkStockCurrent}>Current: {item.stock}</Text>
                </View>
                <TextInput
                  style={styles.bulkStockInput}
                  placeholder="New stock"
                  keyboardType="numeric"
                  value={bulkStockUpdates[item.id] || ''}
                  onChangeText={(value) => setBulkStockUpdates(prev => ({
                    ...prev,
                    [item.id]: value
                  }))}
                />
              </View>
            )}
            style={styles.bulkStockList}
          />

          <View style={styles.modalActions}>
            <Button
              title="Cancel"
              onPress={() => {
                setBulkStockUpdates({});
                setShowStockModal(false);
              }}
              style={[styles.modalButton, styles.cancelButton]}
            />
            <Button
              title="Update Stock"
              onPress={handleBulkStockUpdate}
              style={[styles.modalButton, styles.updateButton]}
            />
          </View>
        </View>
      </View>
    </Modal>
  );

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>❌ {error}</Text>
        <Button title="Retry" onPress={() => { clearError(); loadIngredients(); }} />
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
            placeholder="Search ingredients..."
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

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <Button
          title="➕ Add Ingredient"
          onPress={() => navigation.navigate('IngredientDetail', { mode: 'create' })}
          style={styles.addButton}
        />
        
        <Button
          title="📦 Bulk Stock Update"
          onPress={() => setShowStockModal(true)}
          style={styles.bulkButton}
          disabled={ingredients.length === 0}
        />
      </View>

      {/* Ingredients List */}
      <FlatList
        data={ingredients}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <IngredientCard ingredient={item} />}
        style={styles.ingredientsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {isLoading ? 'Loading ingredients...' : 'No ingredients found'}
            </Text>
          </View>
        }
      />

      {/* Pagination */}
      {ingredientsPagination.total > 0 && (
        <View style={styles.pagination}>
          <Button
            title="◀️ Previous"
            onPress={() => loadIngredients(ingredientsPagination.page - 1)}
            disabled={!ingredientsPagination.hasPrev || isLoading}
            style={styles.paginationButton}
          />
          
          <Text style={styles.paginationText}>
            Page {ingredientsPagination.page} of {Math.ceil(ingredientsPagination.total / ingredientsPagination.limit)}
          </Text>
          
          <Button
            title="Next ▶️"
            onPress={() => loadIngredients(ingredientsPagination.page + 1)}
            disabled={!ingredientsPagination.hasNext || isLoading}
            style={styles.paginationButton}
          />
        </View>
      )}

      <BulkStockModal />
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
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  addButton: {
    flex: 1,
    backgroundColor: '#10B981',
  },
  bulkButton: {
    flex: 1,
    backgroundColor: '#8B5CF6',
  },
  ingredientsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  ingredientCard: {
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
  ingredientInfo: {
    flex: 1,
    marginRight: 12,
  },
  ingredientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  ingredientDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  ingredientStats: {
    alignItems: 'flex-end',
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  stockText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
  },
  cardBody: {
    marginBottom: 12,
  },
  tagsContainer: {
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
  allergensContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  allergensLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  allergensText: {
    fontSize: 12,
    color: '#DC2626',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#3B82F6',
  },
  editButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#111827',
  },
  bulkStockList: {
    flex: 1,
    marginBottom: 20,
  },
  bulkStockItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  bulkStockInfo: {
    flex: 1,
    marginRight: 12,
  },
  bulkStockName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  bulkStockCurrent: {
    fontSize: 12,
    color: '#6B7280',
  },
  bulkStockInput: {
    width: 80,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
  cancelButton: {
    backgroundColor: '#6B7280',
  },
  updateButton: {
    backgroundColor: '#10B981',
  },
});

export default InventoryManagementScreen;