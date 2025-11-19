import { create } from 'zustand';
import { Catalog } from '../types/domain';
import { useConfigStore } from './configStore';

interface CatalogState {
  catalog: Catalog | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  setCatalog: (catalog: Catalog) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchCatalog: () => Promise<void>;
}

export const useCatalogStore = create<CatalogState>((set) => ({
  catalog: null,
  loading: false,
  error: null,

  setCatalog: (catalog) => set({ 
    catalog, 
    error: null 
  }),

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  fetchCatalog: async () => {
    try {
      set({ loading: true, error: null });

      const config = useConfigStore.getState().config;
      if (!config) {
        throw new Error('Configuration not loaded');
      }

      console.log('📡 Fetching catalog from:', `${config.api.baseUrl}/catalog`);

      const response = await fetch(`${config.api.baseUrl}/catalog`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch catalog: ${response.status}`);
      }

      const data = await response.json();

      if (data.ok && data.data) {
        const catalog: Catalog = {
          ingredients: data.data.ingredients || [],
          plates: data.data.plates || [],
        };

        set({ 
          catalog, 
          loading: false, 
          error: null 
        });

        console.log('✅ Catalog refreshed successfully');
      } else {
        throw new Error(data.message || 'Failed to load catalog');
      }

    } catch (error) {
      console.error('❌ Error fetching catalog:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load catalog',
        loading: false 
      });
    }
  },
}));