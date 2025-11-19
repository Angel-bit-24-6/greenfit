import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useConfigStore } from './configStore';
import { useAuthStore } from './authStore';
import { ToastManager } from '../utils/ToastManager';

// Types
export interface Employee {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  type: 'plate' | 'custom';
  plateId?: string;
  customIngredients?: string[];
  quantity: number;
  price: number;
  name: string;
  image?: string;
}

export interface Customer {
  name: string;
  email: string;
  phone?: string;
}

export interface KitchenOrder {
  id: string;
  items: OrderItem[];
  totalPrice: number;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  estimatedReady?: string;
  actualReady?: string;
  preparationTime?: number;
  priority: string;
  assignedTo?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  customer: Customer;
  orderAge: number;
  estimatedPrepTime: number;
  isUrgent: boolean;
}

export interface DashboardSummary {
  queue: {
    pending: number;
    preparing: number;
    ready: number;
  };
  today: {
    completed: number;
    total: number;
    avgPrepTime: number;
  };
  timestamp: string;
}

interface EmployeeState {
  // State
  employee: Employee | null;
  activeOrders: KitchenOrder[];
  selectedOrder: KitchenOrder | null;
  dashboardSummary: DashboardSummary | null;
  isLoading: boolean;
  isAuthenticating: boolean;
  isUpdatingStatus: boolean;
  error: string | null;

  // Actions
  authenticate: (email: string, password: string) => Promise<boolean>;
  fetchActiveOrders: (status?: string) => Promise<void>;
  fetchOrderDetails: (orderId: string) => Promise<KitchenOrder | null>;
  updateOrderStatus: (orderId: string, status: string, employeeId?: string) => Promise<boolean>;
  fetchDashboardSummary: () => Promise<void>;
  setSelectedOrder: (order: KitchenOrder | null) => void;
  logout: () => void;
  clearError: () => void;
}

export const useEmployeeStore = create<EmployeeState>()(
  devtools(
    (set, get) => ({
      // Initial state
      employee: null,
      activeOrders: [],
      selectedOrder: null,
      dashboardSummary: null,
      isLoading: false,
      isAuthenticating: false,
      isUpdatingStatus: false,
      error: null,

      // Actions
      authenticate: async (email: string, password: string) => {
        try {
          set({ isAuthenticating: true, error: null });

          const config = useConfigStore.getState().config;
          if (!config) {
            throw new Error('Configuration not loaded');
          }

          console.log('👨‍🍳 Authenticating employee:', email);

          const response = await fetch(`${config.api.baseUrl}/employee/auth`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Authentication failed');
          }

          const data = await response.json();

          if (data.ok && data.data.user) {
            const employee: Employee = {
              id: data.data.user.id,
              email: data.data.user.email,
              name: data.data.user.name,
              role: data.data.user.role,
              createdAt: data.data.user.createdAt,
            };

            // Update employee store
            set({ 
              employee, 
              isAuthenticating: false,
              error: null
            });

            // Don't update authStore - employees should not go to customer stack

            console.log('✅ Employee authentication successful:', employee.name);
            ToastManager.success(`Welcome back, ${employee.name}!`);
            return true;
          } else {
            throw new Error(data.message || 'Authentication failed');
          }

        } catch (error) {
          console.error('❌ Employee authentication error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
          set({ 
            error: errorMessage,
            isAuthenticating: false,
            employee: null
          });
          ToastManager.error(errorMessage);
          return false;
        }
      },

      fetchActiveOrders: async (status?: string) => {
        try {
          set({ isLoading: true, error: null });

          const config = useConfigStore.getState().config;
          if (!config) {
            throw new Error('Configuration not loaded');
          }

          const params = new URLSearchParams();
          if (status) params.append('status', status);
          params.append('limit', '50');

          const url = `${config.api.baseUrl}/employee/orders/active?${params.toString()}`;
          console.log('📋 Fetching active orders from:', url);

          const response = await fetch(url);

          if (!response.ok) {
            throw new Error(`Failed to fetch orders: ${response.status}`);
          }

          const data = await response.json();

          if (data.ok && data.data) {
            set({ 
              activeOrders: data.data,
              isLoading: false,
              error: null
            });

            console.log(`✅ Loaded ${data.data.length} active orders`);
          } else {
            throw new Error(data.message || 'Failed to load orders');
          }

        } catch (error) {
          console.error('❌ Error fetching active orders:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load orders',
            isLoading: false
          });
        }
      },

      fetchOrderDetails: async (orderId: string) => {
        try {
          const config = useConfigStore.getState().config;
          if (!config) {
            throw new Error('Configuration not loaded');
          }

          console.log('🔍 Fetching order details:', orderId);

          const response = await fetch(`${config.api.baseUrl}/employee/orders/${orderId}`);

          if (!response.ok) {
            throw new Error('Order not found');
          }

          const data = await response.json();

          if (data.ok && data.data) {
            const order: KitchenOrder = data.data;
            set({ selectedOrder: order });
            console.log('✅ Order details loaded:', order.id);
            return order;
          }

          return null;
        } catch (error) {
          console.error('❌ Error fetching order details:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to load order details' });
          return null;
        }
      },

      updateOrderStatus: async (orderId: string, status: string, employeeId?: string) => {
        try {
          set({ isUpdatingStatus: true, error: null });

          const config = useConfigStore.getState().config;
          if (!config) {
            throw new Error('Configuration not loaded');
          }

          const { employee } = get();
          const requestEmployeeId = employeeId || employee?.id;

          console.log(`🔄 Updating order ${orderId} status to: ${status}`);

          const response = await fetch(`${config.api.baseUrl}/employee/orders/${orderId}/status`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status,
              employeeId: requestEmployeeId,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update status');
          }

          const data = await response.json();

          if (data.ok) {
            // Update the order in activeOrders list
            const { activeOrders } = get();
            const updatedOrders = activeOrders.map(order => 
              order.id === orderId ? { ...order, status, updatedAt: new Date().toISOString() } : order
            );

            // Filter out delivered orders from active list
            const filteredOrders = status === 'delivered' 
              ? updatedOrders.filter(order => order.id !== orderId)
              : updatedOrders;

            // Safely update selectedOrder with data validation
            const updatedOrder = data.data ? {
              ...data.data,
              orderAge: Number(data.data.orderAge || 0),
              preparationTime: Number(data.data.preparationTime || 0),
              estimatedPrepTime: Number(data.data.estimatedPrepTime || 0),
              isUrgent: Boolean(data.data.isUrgent),
              createdAt: String(data.data.createdAt || ''),
              updatedAt: String(data.data.updatedAt || new Date().toISOString()),
              status: String(data.data.status || status)
            } : null;

            set({ 
              activeOrders: filteredOrders,
              isUpdatingStatus: false,
              selectedOrder: updatedOrder
            });

            console.log(`✅ Order ${orderId} status updated to: ${status}`);
            ToastManager.success(`Order marked as ${status}`);
            return true;
          } else {
            throw new Error(data.message || 'Status update failed');
          }

        } catch (error) {
          console.error('❌ Error updating order status:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to update status';
          set({ 
            error: errorMessage,
            isUpdatingStatus: false
          });
          ToastManager.error(errorMessage);
          return false;
        }
      },

      fetchDashboardSummary: async () => {
        try {
          const config = useConfigStore.getState().config;
          if (!config) {
            throw new Error('Configuration not loaded');
          }

          const response = await fetch(`${config.api.baseUrl}/employee/dashboard/summary`);

          if (!response.ok) {
            throw new Error('Failed to fetch dashboard summary');
          }

          const data = await response.json();

          if (data.ok && data.data) {
            set({ dashboardSummary: data.data });
            console.log('📊 Dashboard summary updated');
          }

        } catch (error) {
          console.error('❌ Error fetching dashboard summary:', error);
          // Don't set error for summary failures as it's not critical
        }
      },

      setSelectedOrder: (order: KitchenOrder | null) => {
        set({ selectedOrder: order });
      },

      logout: () => {
        set({
          employee: null,
          activeOrders: [],
          selectedOrder: null,
          dashboardSummary: null,
          isLoading: false,
          isAuthenticating: false,
          isUpdatingStatus: false,
          error: null,
        });

        // Employee logout doesn't affect main auth store

        console.log('👋 Employee logged out');
        ToastManager.success('Logged out successfully');
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'employee-store',
    }
  )
);