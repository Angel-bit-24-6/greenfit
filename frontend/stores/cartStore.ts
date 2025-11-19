import { create } from 'zustand';
import { Cart, CartItem } from '../types/domain';
import { useConfigStore } from './configStore';

interface CartState {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  setCart: (cart: Cart) => void;
  addItem: (item: Omit<CartItem, 'id'>) => Promise<boolean>;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  validateCartStock: () => Promise<boolean>;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const generateCartId = (): string => {
  return `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const generateItemId = (): string => {
  return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  loading: false,
  error: null,

  setCart: (cart) => set({ cart, error: null }),

  addItem: async (itemData) => {
    try {
      set({ loading: true, error: null });

      // Get config from store
      const config = useConfigStore.getState().config;
      if (!config) {
        throw new Error('Configuration not loaded');
      }

      // First validate stock for the new item
      const stockValidation = await fetch(`${config.api.baseUrl}/stock/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [{
            type: itemData.type,
            plateId: itemData.plateId,
            customIngredients: itemData.customIngredients,
            quantity: itemData.quantity,
            name: itemData.name,
          }]
        }),
      });

      if (!stockValidation.ok) {
        set({ error: 'Failed to validate stock', loading: false });
        return false;
      }

      const stockData = await stockValidation.json();
      
      if (!stockData.ok || !stockData.data.allValid) {
        const issues = stockData.data.results[0]?.issues || ['Stock not available'];
        set({ error: issues[0], loading: false });
        return false;
      }

      // Stock is valid, proceed with adding to cart
      const { cart } = get();
      const now = new Date().toISOString();
      
      if (!cart) {
        const newCart: Cart = {
          id: generateCartId(),
          userId: 'temp_user',
          items: [{
            ...itemData,
            id: generateItemId()
          }],
          totalPrice: itemData.price * itemData.quantity,
          createdAt: now,
          updatedAt: now
        };
        set({ cart: newCart, loading: false });
        return true;
      }

      // Check if identical item already exists
      const existingItemIndex = cart.items.findIndex(item => {
        // For standard plates: same plateId + no custom ingredients
        if (item.type === 'plate' && itemData.type === 'plate') {
          return item.plateId === itemData.plateId && 
                 !item.customIngredients && 
                 !itemData.customIngredients;
        }
        
        // For custom plates: compare custom ingredients arrays
        if (item.type === 'custom' && itemData.type === 'custom') {
          const itemIngredients = item.customIngredients?.sort().join(',') || '';
          const newIngredients = itemData.customIngredients?.sort().join(',') || '';
          return itemIngredients === newIngredients;
        }

        // For modified plates: compare plateId + custom ingredients
        if (item.type === 'plate' && itemData.type === 'plate' && 
            item.plateId === itemData.plateId &&
            (item.customIngredients || itemData.customIngredients)) {
          const itemIngredients = item.customIngredients?.sort().join(',') || '';
          const newIngredients = itemData.customIngredients?.sort().join(',') || '';
          return itemIngredients === newIngredients;
        }
        
        return false;
      });

      let updatedItems: any[];

      if (existingItemIndex >= 0) {
        // Item exists: validate total quantity after increment
        const newQuantity = cart.items[existingItemIndex].quantity + itemData.quantity;
        
        // Get config from store
        const config = useConfigStore.getState().config;
        if (!config) {
          throw new Error('Configuration not loaded');
        }

        // Re-validate with new total quantity
        const totalStockValidation = await fetch(`${config.api.baseUrl}/stock/validate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items: [{
              type: itemData.type,
              plateId: itemData.plateId,
              customIngredients: itemData.customIngredients,
              quantity: newQuantity,
              name: itemData.name,
            }]
          }),
        });

        if (!totalStockValidation.ok) {
          set({ error: 'Failed to validate total quantity', loading: false });
          return false;
        }

        const totalStockData = await totalStockValidation.json();
        
        if (!totalStockData.ok || !totalStockData.data.allValid) {
          const issues = totalStockData.data.results[0]?.issues || ['Insufficient stock for total quantity'];
          set({ error: issues[0], loading: false });
          return false;
        }

        // Update quantity
        updatedItems = cart.items.map((item, index) => 
          index === existingItemIndex 
            ? { ...item, quantity: newQuantity }
            : item
        );
      } else {
        // New unique item: add to cart
        updatedItems = [
          ...cart.items,
          {
            ...itemData,
            id: generateItemId()
          }
        ];
      }

      const totalPrice = updatedItems.reduce(
        (total, item) => total + (item.price * item.quantity), 
        0
      );

      const updatedCart: Cart = {
        ...cart,
        items: updatedItems,
        totalPrice,
        updatedAt: now
      };

      set({ cart: updatedCart, loading: false });
      return true;

    } catch (error) {
      console.error('Error adding item to cart:', error);
      set({ error: 'Failed to add item to cart', loading: false });
      return false;
    }
  },

  removeItem: (itemId) => {
    const { cart } = get();
    if (!cart) return;

    const updatedItems = cart.items.filter(item => item.id !== itemId);
    
    if (updatedItems.length === 0) {
      set({ cart: null });
      return;
    }

    const totalPrice = updatedItems.reduce(
      (total, item) => total + (item.price * item.quantity), 
      0
    );

    const updatedCart: Cart = {
      ...cart,
      items: updatedItems,
      totalPrice,
      updatedAt: new Date().toISOString()
    };

    set({ cart: updatedCart });
  },

  clearCart: () => set({ cart: null, error: null }),

  validateCartStock: async () => {
    const { cart } = get();
    if (!cart || cart.items.length === 0) {
      return true;
    }

    try {
      set({ loading: true, error: null });

      const cartItems = cart.items.map(item => ({
        type: item.type,
        plateId: item.plateId,
        customIngredients: item.customIngredients,
        quantity: item.quantity,
        name: item.name,
      }));

      // Get config from store
      const config = useConfigStore.getState().config;
      if (!config) {
        throw new Error('Configuration not loaded');
      }

      const response = await fetch(`${config.api.baseUrl}/stock/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items: cartItems }),
      });

      if (!response.ok) {
        set({ error: 'Failed to validate cart stock', loading: false });
        return false;
      }

      const data = await response.json();
      
      if (!data.ok || !data.data.allValid) {
        const firstIssue = data.data.results.find((r: any) => !r.valid);
        const errorMessage = firstIssue?.issues[0] || 'Some items are out of stock';
        set({ error: errorMessage, loading: false });
        return false;
      }

      set({ loading: false });
      return true;

    } catch (error) {
      console.error('Error validating cart stock:', error);
      set({ error: 'Failed to validate cart stock', loading: false });
      return false;
    }
  },

  getTotalItems: () => {
    const { cart } = get();
    return cart?.items.reduce((total, item) => total + item.quantity, 0) || 0;
  },

  getTotalPrice: () => {
    const { cart } = get();
    return cart?.totalPrice || 0;
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));