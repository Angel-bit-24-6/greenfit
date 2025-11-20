import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useConfigStore } from './configStore';
import { useAuthStore } from './authStore';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  weightInKg: number;
  name: string;
  image?: string;
  producerName?: string;
  product?: {
    id: string;
    name: string;
    category: string;
    producer?: {
      id: string;
      businessName: string;
      location?: string;
    };
  };
}

export interface Order {
  id: string;
  userId: string;
  totalWeightInKg: number;
  status: string;
  deliveryAddress?: string;
  deliveryDate?: string;
  notes?: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

interface OrderState {
  orders: Order[];
  currentOrder: Order | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  createOrder: (data: {
    deliveryAddress: string;
    deliveryDate?: string;
    notes?: string;
  }) => Promise<boolean>;
  fetchOrders: () => Promise<void>;
  fetchOrderById: (id: string) => Promise<void>;
  setCurrentOrder: (order: Order | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const ORDERS_STORAGE_KEY = 'nutrifresco_orders';

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  currentOrder: null,
  loading: false,
  error: null,

  createOrder: async (data) => {
    try {
      set({ loading: true, error: null });

      const config = useConfigStore.getState().config;
      const token = useAuthStore.getState().token;

      if (!config || !token) {
        throw new Error('Not authenticated or config not loaded');
      }

      const response = await fetch(`${config.api.baseUrl}/orders/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (responseData.ok && responseData.data) {
        // Agregar a la lista de pedidos
        set((state) => ({
          orders: [responseData.data, ...state.orders],
          currentOrder: responseData.data,
          error: null
        }));

        // Limpiar carrito después de crear pedido
        const { useCartStore } = await import('./cartStore_nutrifresco');
        await useCartStore.getState().clearCart();

        // Actualizar suscripción
        const { useSubscriptionStore } = await import('./subscriptionStore');
        await useSubscriptionStore.getState().fetchCurrentSubscription();

        return true;
      } else {
        throw new Error(responseData.message || 'Failed to create order');
      }
    } catch (error) {
      console.error('❌ Create order error:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false 
      });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  fetchOrders: async () => {
    try {
      set({ loading: true, error: null });

      const config = useConfigStore.getState().config;
      const token = useAuthStore.getState().token;

      if (!config || !token) {
        throw new Error('Not authenticated or config not loaded');
      }

      const response = await fetch(`${config.api.baseUrl}/orders`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.ok && data.data) {
        await AsyncStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(data.data));
        set({ orders: data.data, error: null });
      } else {
        throw new Error(data.message || 'Failed to fetch orders');
      }
    } catch (error) {
      console.error('❌ Fetch orders error:', error);
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  fetchOrderById: async (id: string) => {
    try {
      set({ loading: true, error: null });

      const config = useConfigStore.getState().config;
      const token = useAuthStore.getState().token;

      if (!config || !token) {
        throw new Error('Not authenticated or config not loaded');
      }

      const response = await fetch(`${config.api.baseUrl}/orders/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.ok && data.data) {
        set({ currentOrder: data.data, error: null });
      } else {
        throw new Error(data.message || 'Failed to fetch order');
      }
    } catch (error) {
      console.error('❌ Fetch order error:', error);
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  setCurrentOrder: (order) => set({ currentOrder: order }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));

