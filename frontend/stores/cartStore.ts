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
      let stockValidation;
      try {
        console.log(`🌐 Attempting to validate stock at: ${config.api.baseUrl}/stock/validate`);
        stockValidation = await fetch(`${config.api.baseUrl}/stock/validate`, {
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
        console.log(`✅ Stock validation response status: ${stockValidation.status}`);
      } catch (fetchError: any) {
        console.error('❌ Network error validating stock:', fetchError);
        const errorMessage = fetchError?.message || 'Error de conexión';
        
        // Provide more specific error messages
        if (errorMessage.includes('Network request failed') || errorMessage.includes('Failed to fetch')) {
          set({ 
            error: `No se pudo conectar al servidor. Verifica que el backend esté corriendo en ${config.api.baseUrl}`, 
            loading: false 
          });
        } else {
          set({ 
            error: `Error de conexión: ${errorMessage}`, 
            loading: false 
          });
        }
        return false;
      }

      if (!stockValidation.ok) {
        const errorText = await stockValidation.text();
        let errorMessage = 'Failed to validate stock';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = `Error del servidor (${stockValidation.status})`;
        }
        set({ error: errorMessage, loading: false });
        return false;
      }

      const stockData = await stockValidation.json();
      
      console.log('📦 Stock validation response:', JSON.stringify(stockData, null, 2));
      
      if (!stockData.ok) {
        const errorMessage = stockData.message || 'Error al validar stock';
        set({ error: errorMessage, loading: false });
        return false;
      }
      
      if (!stockData.data || !stockData.data.allValid) {
        const issues = stockData.data?.results?.[0]?.issues || ['Stock not available'];
        const errorMessage = issues[0] || 'El item no está disponible';
        console.log('❌ Stock validation failed:', issues);
        set({ error: errorMessage, loading: false });
        return false;
      }
      
      console.log('✅ Stock validation passed');

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

    } catch (error: any) {
      console.error('❌ Error adding item to cart:', error);
      let errorMessage = 'No se pudo agregar al carrito';
      
      if (error instanceof Error) {
        if (error.message.includes('Configuration not loaded')) {
          errorMessage = 'La aplicación no está configurada correctamente';
        } else if (error.message.includes('Network request failed') || 
                   error.message.includes('Failed to fetch') ||
                   error.message.includes('fetch') || 
                   error.message.includes('network')) {
          const config = useConfigStore.getState().config;
          const apiUrl = config?.api?.baseUrl || 'servidor';
          errorMessage = `Error de conexión. Verifica que el backend esté corriendo en ${apiUrl}`;
        } else {
          errorMessage = error.message;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      set({ error: errorMessage, loading: false });
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