import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ProductCategory = 
  | 'FRUITS' 
  | 'VEGETABLES' 
  | 'LEGUMES' 
  | 'HERBS' 
  | 'SNACKS' 
  | 'COFFEE' 
  | 'CHOCOLATE' 
  | 'PROTEINS';

export interface Product {
  id: string;
  producerId: string;
  name: string;
  description?: string;
  category: ProductCategory;
  weightInKg: number;
  available: boolean;
  stock: number;
  image?: string;
  origin?: string;
  season?: string;
  nutritionalInfo?: any;
  tags: string[];
  producer?: {
    id: string;
    businessName: string;
    location?: string;
    verified: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

interface ProductFilters {
  category?: ProductCategory;
  producerId?: string;
  available?: boolean;
}

interface ProductState {
  products: Product[];
  selectedProduct: Product | null;
  loading: boolean;
  error: string | null;
  filters: ProductFilters;
  
  // Actions
  fetchProducts: (filters?: ProductFilters) => Promise<void>;
  fetchProductById: (id: string) => Promise<void>;
  fetchProductsByProducer: (producerId: string) => Promise<void>;
  filterByCategory: (category: ProductCategory | null) => void;
  setSelectedProduct: (product: Product | null) => void;
  setFilters: (filters: ProductFilters) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const PRODUCTS_STORAGE_KEY = 'nutrifresco_products';

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  selectedProduct: null,
  loading: false,
  error: null,
  filters: {},

  fetchProducts: async (filters?: ProductFilters) => {
    try {
      set({ loading: true, error: null });

      const { useConfigStore } = await import('./configStore');
      const { useAuthStore } = await import('./authStore');
      const config = useConfigStore.getState().config;
      const token = useAuthStore.getState().token;

      if (!config) {
        throw new Error('Configuration not loaded');
      }

      // Construir query string
      const queryParams = new URLSearchParams();
      if (filters?.category) queryParams.append('category', filters.category);
      if (filters?.producerId) queryParams.append('producerId', filters.producerId);
      if (filters?.available !== undefined) queryParams.append('available', String(filters.available));

      const url = `${config.api.baseUrl}/products${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      const data = await response.json();

      if (data.ok && data.data) {
        // Normalizar tags para asegurar que siempre sean arrays
        const normalizedProducts = data.data.map((product: any) => ({
          ...product,
          tags: Array.isArray(product.tags) 
            ? product.tags 
            : (typeof product.tags === 'string' ? JSON.parse(product.tags) : [])
        }));
        
        await AsyncStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(normalizedProducts));
        set({ products: normalizedProducts, filters: filters || {}, error: null });
      } else {
        throw new Error(data.message || 'Failed to fetch products');
      }
    } catch (error) {
      console.error('❌ Fetch products error:', error);
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  fetchProductById: async (id: string) => {
    try {
      set({ loading: true, error: null });

      const { useConfigStore } = await import('./configStore');
      const { useAuthStore } = await import('./authStore');
      const config = useConfigStore.getState().config;
      const token = useAuthStore.getState().token;

      if (!config) {
        throw new Error('Configuration not loaded');
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${config.api.baseUrl}/products/${id}`, {
        method: 'GET',
        headers,
      });

      const data = await response.json();

      if (data.ok && data.data) {
        // Normalizar tags para asegurar que siempre sean arrays
        const normalizedProduct = {
          ...data.data,
          tags: Array.isArray(data.data.tags) 
            ? data.data.tags 
            : (typeof data.data.tags === 'string' ? JSON.parse(data.data.tags) : [])
        };
        set({ selectedProduct: normalizedProduct, error: null });
      } else {
        throw new Error(data.message || 'Failed to fetch product');
      }
    } catch (error) {
      console.error('❌ Fetch product error:', error);
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  fetchProductsByProducer: async (producerId: string) => {
    try {
      set({ loading: true, error: null });

      const { useConfigStore } = await import('./configStore');
      const { useAuthStore } = await import('./authStore');
      const config = useConfigStore.getState().config;
      const token = useAuthStore.getState().token;

      if (!config) {
        throw new Error('Configuration not loaded');
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${config.api.baseUrl}/products/by-producer/${producerId}`, {
        method: 'GET',
        headers,
      });

      const data = await response.json();

      if (data.ok && data.data) {
        // Normalizar tags para asegurar que siempre sean arrays
        const normalizedProducts = data.data.map((product: any) => ({
          ...product,
          tags: Array.isArray(product.tags) 
            ? product.tags 
            : (typeof product.tags === 'string' ? JSON.parse(product.tags) : [])
        }));
        set({ products: normalizedProducts, error: null });
      } else {
        throw new Error(data.message || 'Failed to fetch products by producer');
      }
    } catch (error) {
      console.error('❌ Fetch products by producer error:', error);
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  filterByCategory: (category: ProductCategory | null) => {
    const currentFilters = get().filters;
    set({
      filters: {
        ...currentFilters,
        category: category || undefined
      }
    });
  },

  setSelectedProduct: (product) => set({ selectedProduct: product }),
  setFilters: (filters) => set({ filters }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));

