import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useConfigStore } from './configStore';
import { ToastManager } from '../utils/ToastManager';

// Types for Admin Panel
export interface AdminIngredient {
  id: string;
  name: string;
  synonyms: string[];
  stock: number;
  price: number;
  allergens: string[];
  tags: string[];
  available: boolean;
  description?: string;
  nutritionalInfo?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AdminPlateIngredient {
  id: string;
  ingredientId: string;
  quantity: number;
  required: boolean;
  ingredient: {
    id: string;
    name: string;
    available: boolean;
    stock: number;
    price: number;
  };
}

export interface AdminPlate {
  id: string;
  name: string;
  description: string;
  price: number;
  tags: string[];
  available: boolean;
  preparationTime?: number;
  nutritionalInfo?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  ingredients: AdminPlateIngredient[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  totalOrders: number;
  totalRevenue: number;
}

export interface SystemOverview {
  summary: {
    totalUsers: number;
    totalIngredients: number;
    totalPlates: number;
    activeOrders: number;
    lowStockIngredients: number;
    unavailablePlates: number;
  };
  metrics: {
    todayOrders: number;
    weekOrders: number;
    monthRevenue: number;
  };
  alerts: {
    lowStock: boolean;
    unavailablePlates: boolean;
    activeOrdersHigh: boolean;
  };
  recentActivity: Array<{
    id: string;
    customerName: string;
    totalPrice: number;
    status: string;
    createdAt: string;
  }>;
}

interface AdminState {
  // Auth & General
  adminUser: { id: string; name: string; email: string; role: string; token?: string } | null;
  isLoading: boolean;
  error: string | null;

  // Data
  ingredients: AdminIngredient[];
  plates: AdminPlate[];
  users: AdminUser[];
  systemOverview: SystemOverview | null;

  // Pagination
  ingredientsPagination: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  platesPagination: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  usersPagination: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };

  // Actions
  setAdminUser: (user: any) => void;
  logout: () => Promise<void>;
  initializeAdminAuth: () => Promise<void>;
  clearError: () => void;
  makeAuthenticatedRequest: (endpoint: string, options?: RequestInit) => Promise<any>;

  // Data fetching
  fetchSystemOverview: () => Promise<void>;
  fetchIngredients: (page?: number, filters?: any) => Promise<void>;
  fetchPlates: (page?: number, filters?: any) => Promise<void>;
  fetchUsers: (page?: number, filters?: any) => Promise<void>;

  // CRUD operations
  createIngredient: (data: any) => Promise<boolean>;
  updateIngredient: (id: string, data: any) => Promise<boolean>;
  deleteIngredient: (id: string) => Promise<boolean>;
  bulkUpdateStock: (updates: Array<{ id: string; stock: number }>) => Promise<boolean>;

  createPlate: (data: any) => Promise<boolean>;
  updatePlate: (id: string, data: any) => Promise<boolean>;
  deletePlate: (id: string) => Promise<boolean>;

  updateUserRole: (id: string, role: string) => Promise<boolean>;
}

export const useAdminStore = create<AdminState>()(
  devtools(
    (set, get) => ({
      // Initial state
      adminUser: null,
      isLoading: false,
      error: null,
      
      ingredients: [],
      plates: [],
      users: [],
      systemOverview: null,
      
      ingredientsPagination: { total: 0, page: 1, limit: 20, hasNext: false, hasPrev: false },
      platesPagination: { total: 0, page: 1, limit: 20, hasNext: false, hasPrev: false },
      usersPagination: { total: 0, page: 1, limit: 20, hasNext: false, hasPrev: false },

      // Actions
      setAdminUser: async (user) => {
        set({ adminUser: user });
        if (user && user.token) {
          // Store admin session persistently
          await AsyncStorage.setItem('greenfit_admin_token', user.token);
          await AsyncStorage.setItem('greenfit_admin_user', JSON.stringify(user));
          console.log('🔐 Admin session stored persistently');
        }
      },

      logout: async () => {
        console.log('🔐 Admin logging out...');
        
        // Clear persistent storage
        await AsyncStorage.removeItem('greenfit_admin_token');
        await AsyncStorage.removeItem('greenfit_admin_user');
        
        // Clear state
        set({
          adminUser: null,
          systemOverview: null,
          ingredients: [],
          plates: [],
          users: [],
          error: null,
        });
        
        console.log('✅ Admin session cleared');
      },

      initializeAdminAuth: async () => {
        try {
          set({ isLoading: true });

          const token = await AsyncStorage.getItem('greenfit_admin_token');
          const userStr = await AsyncStorage.getItem('greenfit_admin_user');

          if (token && userStr) {
            const user = JSON.parse(userStr);
            
            // Verify token is still valid by making a test request
            const config = useConfigStore.getState().config;
            if (config) {
              const response = await fetch(`${config.api.baseUrl}/admin/overview`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });

              if (response.ok) {
                set({ adminUser: user, isLoading: false });
                console.log('🔐 Admin session restored:', user.email);
                return;
              } else {
                // Token expired, clear storage
                await AsyncStorage.removeItem('greenfit_admin_token');
                await AsyncStorage.removeItem('greenfit_admin_user');
                console.log('❌ Admin token expired, cleared storage');
              }
            }
          }

          // No valid session
          set({ adminUser: null, isLoading: false });
        } catch (error) {
          console.error('❌ Admin auth initialization error:', error);
          set({ adminUser: null, isLoading: false, error: 'Failed to restore admin session' });
        }
      },

      clearError: () => set({ error: null }),

      // Helper function to make authenticated requests
      makeAuthenticatedRequest: async (endpoint: string, options: RequestInit = {}) => {
        const config = useConfigStore.getState().config;
        const { adminUser } = get();
        
        if (!config) throw new Error('Configuration not loaded');
        if (!adminUser || !adminUser.token) throw new Error('Admin user not authenticated');

        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminUser.token}`,
          ...options.headers,
        };

        const response = await fetch(`${config.api.baseUrl}/admin${endpoint}`, {
          ...options,
          headers,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || errorData.message || 'Request failed');
        }

        return response.json();
      },

      // System Overview
      fetchSystemOverview: async () => {
        try {
          set({ isLoading: true, error: null });
          const data = await get().makeAuthenticatedRequest('/overview');
          
          if (data.ok) {
            set({ systemOverview: data.data, isLoading: false });
          }
        } catch (error) {
          console.error('❌ Error fetching system overview:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch system overview',
            isLoading: false,
          });
        }
      },

      // Ingredients
      fetchIngredients: async (page = 1, filters = {}) => {
        try {
          set({ isLoading: true, error: null });

          const params = new URLSearchParams({
            page: page.toString(),
            limit: '20',
            ...Object.entries(filters).reduce((acc, [key, value]) => {
              if (value) acc[key] = String(value);
              return acc;
            }, {} as Record<string, string>)
          });

          const data = await get().makeAuthenticatedRequest(`/ingredients?${params}`);

          if (data.ok) {
            set({
              ingredients: data.data,
              ingredientsPagination: {
                total: data.meta.total,
                page: data.meta.page,
                limit: data.meta.limit,
                hasNext: data.meta.hasNext,
                hasPrev: data.meta.hasPrev,
              },
              isLoading: false,
            });
          }
        } catch (error) {
          console.error('❌ Error fetching ingredients:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch ingredients',
            isLoading: false,
          });
        }
      },

      createIngredient: async (data) => {
        try {
          set({ isLoading: true, error: null });
          const response = await get().makeAuthenticatedRequest('/ingredients', {
            method: 'POST',
            body: JSON.stringify(data),
          });

          if (response.ok) {
            ToastManager.success('Ingredient created successfully');
            await get().fetchIngredients();
            set({ isLoading: false });
            return true;
          }
          return false;
        } catch (error) {
          console.error('❌ Error creating ingredient:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to create ingredient';
          set({ error: errorMessage, isLoading: false });
          ToastManager.error(errorMessage);
          return false;
        }
      },

      updateIngredient: async (id, data) => {
        try {
          set({ isLoading: true, error: null });
          const response = await get().makeAuthenticatedRequest(`/ingredients/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
          });

          if (response.ok) {
            ToastManager.success('Ingredient updated successfully');
            await get().fetchIngredients();
            set({ isLoading: false });
            return true;
          }
          return false;
        } catch (error) {
          console.error('❌ Error updating ingredient:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to update ingredient';
          set({ error: errorMessage, isLoading: false });
          ToastManager.error(errorMessage);
          return false;
        }
      },

      deleteIngredient: async (id) => {
        try {
          set({ isLoading: true, error: null });
          const response = await get().makeAuthenticatedRequest(`/ingredients/${id}`, {
            method: 'DELETE',
          });

          if (response.ok) {
            ToastManager.success('Ingredient deleted successfully');
            await get().fetchIngredients();
            set({ isLoading: false });
            return true;
          }
          return false;
        } catch (error) {
          console.error('❌ Error deleting ingredient:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete ingredient';
          set({ error: errorMessage, isLoading: false });
          ToastManager.error(errorMessage);
          return false;
        }
      },

      bulkUpdateStock: async (updates) => {
        try {
          set({ isLoading: true, error: null });
          const response = await get().makeAuthenticatedRequest('/ingredients/bulk-stock', {
            method: 'POST',
            body: JSON.stringify({ updates }),
          });

          if (response.ok) {
            ToastManager.success(`Stock updated: ${response.data.successful} successful, ${response.data.failed} failed`);
            await get().fetchIngredients();
            set({ isLoading: false });
            return true;
          }
          return false;
        } catch (error) {
          console.error('❌ Error bulk updating stock:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to update stock';
          set({ error: errorMessage, isLoading: false });
          ToastManager.error(errorMessage);
          return false;
        }
      },

      // Plates
      fetchPlates: async (page = 1, filters = {}) => {
        try {
          set({ isLoading: true, error: null });

          const params = new URLSearchParams({
            page: page.toString(),
            limit: '20',
            ...Object.entries(filters).reduce((acc, [key, value]) => {
              if (value) acc[key] = String(value);
              return acc;
            }, {} as Record<string, string>)
          });

          const data = await get().makeAuthenticatedRequest(`/plates?${params}`);

          if (data.ok) {
            set({
              plates: data.data,
              platesPagination: {
                total: data.meta.total,
                page: data.meta.page,
                limit: data.meta.limit,
                hasNext: data.meta.hasNext,
                hasPrev: data.meta.hasPrev,
              },
              isLoading: false,
            });
          }
        } catch (error) {
          console.error('❌ Error fetching plates:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch plates',
            isLoading: false,
          });
        }
      },

      createPlate: async (data) => {
        try {
          set({ isLoading: true, error: null });
          const response = await get().makeAuthenticatedRequest('/plates', {
            method: 'POST',
            body: JSON.stringify(data),
          });

          if (response.ok) {
            ToastManager.success('Plate created successfully');
            await get().fetchPlates();
            set({ isLoading: false });
            return true;
          }
          return false;
        } catch (error) {
          console.error('❌ Error creating plate:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to create plate';
          set({ error: errorMessage, isLoading: false });
          ToastManager.error(errorMessage);
          return false;
        }
      },

      updatePlate: async (id, data) => {
        try {
          set({ isLoading: true, error: null });
          const response = await get().makeAuthenticatedRequest(`/plates/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
          });

          if (response.ok) {
            ToastManager.success('Plate updated successfully');
            await get().fetchPlates();
            set({ isLoading: false });
            return true;
          }
          return false;
        } catch (error) {
          console.error('❌ Error updating plate:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to update plate';
          set({ error: errorMessage, isLoading: false });
          ToastManager.error(errorMessage);
          return false;
        }
      },

      deletePlate: async (id) => {
        try {
          set({ isLoading: true, error: null });
          const response = await get().makeAuthenticatedRequest(`/plates/${id}`, {
            method: 'DELETE',
          });

          if (response.ok) {
            ToastManager.success('Plate deleted successfully');
            await get().fetchPlates();
            set({ isLoading: false });
            return true;
          }
          return false;
        } catch (error) {
          console.error('❌ Error deleting plate:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete plate';
          set({ error: errorMessage, isLoading: false });
          ToastManager.error(errorMessage);
          return false;
        }
      },

      // Users
      fetchUsers: async (page = 1, filters = {}) => {
        try {
          set({ isLoading: true, error: null });

          const params = new URLSearchParams({
            page: page.toString(),
            limit: '20',
            ...Object.entries(filters).reduce((acc, [key, value]) => {
              if (value) acc[key] = String(value);
              return acc;
            }, {} as Record<string, string>)
          });

          const data = await get().makeAuthenticatedRequest(`/users?${params}`);

          if (data.ok) {
            set({
              users: data.data,
              usersPagination: {
                total: data.meta.total,
                page: data.meta.page,
                limit: data.meta.limit,
                hasNext: data.meta.hasNext,
                hasPrev: data.meta.hasPrev,
              },
              isLoading: false,
            });
          }
        } catch (error) {
          console.error('❌ Error fetching users:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch users',
            isLoading: false,
          });
        }
      },

      updateUserRole: async (id, role) => {
        try {
          set({ isLoading: true, error: null });
          const response = await get().makeAuthenticatedRequest(`/users/${id}/role`, {
            method: 'PUT',
            body: JSON.stringify({ role }),
          });

          if (response.ok) {
            ToastManager.success('User role updated successfully');
            await get().fetchUsers();
            set({ isLoading: false });
            return true;
          }
          return false;
        } catch (error) {
          console.error('❌ Error updating user role:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to update user role';
          set({ error: errorMessage, isLoading: false });
          ToastManager.error(errorMessage);
          return false;
        }
      },
    }),
    {
      name: 'admin-store',
    }
  )
);