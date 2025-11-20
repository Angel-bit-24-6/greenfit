import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useConfigStore } from './configStore';
import { useAuthStore } from './authStore';
import { useSubscriptionStore } from './subscriptionStore';

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  weightInKg: number; // Peso total del item
  name: string;
  image?: string;
  product?: {
    id: string;
    name: string;
    weightInKg: number;
    category: string;
    producer?: {
      id: string;
      businessName: string;
      location?: string;
    };
  };
  createdAt: string;
}

export interface Cart {
  id: string;
  userId: string;
  totalWeightInKg: number;
  items: CartItem[];
  limitInKg?: number;
  usedKg?: number;
  remainingKg?: number;
  createdAt: string;
  updatedAt: string;
}

interface CartState {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchCart: () => Promise<void>;
  addItem: (productId: string, quantity: number) => Promise<boolean>;
  updateQuantity: (itemId: string, quantity: number) => Promise<boolean>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  validateWeight: (weightToAdd: number) => Promise<boolean>;
  getTotalItems: () => number;
  getTotalWeightInKg: () => number;
  getRemainingKg: () => number;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const CART_STORAGE_KEY = 'nutrifresco_cart';

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  loading: false,
  error: null,

  fetchCart: async () => {
    try {
      set({ loading: true, error: null });

      const config = useConfigStore.getState().config;
      const token = useAuthStore.getState().token;

      if (!config || !token) {
        throw new Error('Not authenticated or config not loaded');
      }

      const response = await fetch(`${config.api.baseUrl}/cart`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.ok && data.data) {
        await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(data.data));
        set({ cart: data.data, error: null });
      } else {
        throw new Error(data.message || 'Failed to fetch cart');
      }
    } catch (error) {
      console.error('❌ Fetch cart error:', error);
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  addItem: async (productId: string, quantity: number) => {
    try {
      set({ loading: true, error: null });

      const config = useConfigStore.getState().config;
      const token = useAuthStore.getState().token;

      if (!config || !token) {
        throw new Error('Not authenticated or config not loaded');
      }

      // Validar peso antes de agregar
      const { useProductStore } = await import('./productStore');
      const { useSubscriptionStore } = await import('./subscriptionStore');
      
      await useProductStore.getState().fetchProductById(productId);
      const product = useProductStore.getState().selectedProduct;
      
      if (!product) {
        throw new Error('Producto no encontrado');
      }

      const weightToAdd = product.weightInKg * quantity;
      const canAdd = useSubscriptionStore.getState().canAddProduct(weightToAdd);

      if (!canAdd) {
        const remaining = useSubscriptionStore.getState().getRemainingKg();
        set({ 
          error: `No puedes agregar este producto. Te quedan ${remaining.toFixed(2)} kg disponibles.`,
          loading: false 
        });
        return false;
      }

      // Validar categoría según plan
      const categoryAllowed = useSubscriptionStore.getState().validateCategory(product.category);
      if (!categoryAllowed) {
        const subscription = useSubscriptionStore.getState().subscription;
        set({ 
          error: `Tu plan ${subscription?.plan} no permite productos de la categoría ${product.category}.`,
          loading: false 
        });
        return false;
      }

      // Agregar al carrito
      const response = await fetch(`${config.api.baseUrl}/cart/add`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId, quantity }),
      });

      const data = await response.json();

      if (data.ok && data.data) {
        await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(data.data.cart));
        set({ cart: data.data.cart, error: null });
        
        // Actualizar suscripción
        await useSubscriptionStore.getState().fetchCurrentSubscription();
        
        return true;
      } else {
        throw new Error(data.message || 'Failed to add item to cart');
      }
    } catch (error) {
      console.error('❌ Add item error:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false 
      });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  updateQuantity: async (itemId: string, quantity: number) => {
    try {
      set({ loading: true, error: null });

      const config = useConfigStore.getState().config;
      const token = useAuthStore.getState().token;

      if (!config || !token) {
        throw new Error('Not authenticated or config not loaded');
      }

      const response = await fetch(`${config.api.baseUrl}/cart/update`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemId, quantity }),
      });

      const data = await response.json();

      if (data.ok) {
        // Recargar carrito
        await get().fetchCart();
        
        // Actualizar suscripción
        const { useSubscriptionStore } = await import('./subscriptionStore');
        await useSubscriptionStore.getState().fetchCurrentSubscription();
        
        return true;
      } else {
        throw new Error(data.message || 'Failed to update quantity');
      }
    } catch (error) {
      console.error('❌ Update quantity error:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false 
      });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  removeItem: async (itemId: string) => {
    try {
      set({ loading: true, error: null });

      const config = useConfigStore.getState().config;
      const token = useAuthStore.getState().token;

      if (!config || !token) {
        throw new Error('Not authenticated or config not loaded');
      }

      const response = await fetch(`${config.api.baseUrl}/cart/remove/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.ok) {
        // Recargar carrito
        await get().fetchCart();
        
        // Actualizar suscripción
        const { useSubscriptionStore } = await import('./subscriptionStore');
        await useSubscriptionStore.getState().fetchCurrentSubscription();
      } else {
        throw new Error(data.message || 'Failed to remove item');
      }
    } catch (error) {
      console.error('❌ Remove item error:', error);
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  clearCart: async () => {
    try {
      set({ loading: true, error: null });

      const config = useConfigStore.getState().config;
      const token = useAuthStore.getState().token;

      if (!config || !token) {
        throw new Error('Not authenticated or config not loaded');
      }

      const response = await fetch(`${config.api.baseUrl}/cart/clear`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.ok) {
        await AsyncStorage.removeItem(CART_STORAGE_KEY);
        set({ cart: null, error: null });
      } else {
        throw new Error(data.message || 'Failed to clear cart');
      }
    } catch (error) {
      console.error('❌ Clear cart error:', error);
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  validateWeight: async (weightToAdd: number) => {
    try {
      const config = useConfigStore.getState().config;
      const token = useAuthStore.getState().token;

      if (!config || !token) {
        return false;
      }

      const response = await fetch(`${config.api.baseUrl}/subscription/validate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ weightInKg: weightToAdd }),
      });

      const data = await response.json();

      return data.ok && data.data?.canAdd === true;
    } catch (error) {
      console.error('❌ Validate weight error:', error);
      return false;
    }
  },

  getTotalItems: () => {
    const { cart } = get();
    if (!cart || !cart.items) return 0;
    return cart.items.reduce((total, item) => total + item.quantity, 0);
  },

  getTotalWeightInKg: () => {
    const { cart } = get();
    return cart?.totalWeightInKg || 0;
  },

  getRemainingKg: () => {
    const { cart } = get();
    return cart?.remainingKg || 0;
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));

