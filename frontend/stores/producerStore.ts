import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Producer {
  id: string;
  userId: string;
  businessName: string;
  description?: string;
  location?: string;
  contactInfo?: any;
  verified: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  products?: any[];
  createdAt: string;
  updatedAt: string;
}

interface ProducerState {
  producers: Producer[];
  selectedProducer: Producer | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchProducers: () => Promise<void>;
  fetchProducerById: (id: string) => Promise<void>;
  registerProducer: (data: {
    businessName: string;
    description?: string;
    location?: string;
    contactInfo?: any;
  }) => Promise<boolean>;
  setSelectedProducer: (producer: Producer | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const PRODUCERS_STORAGE_KEY = 'nutrifresco_producers';

export const useProducerStore = create<ProducerState>((set, get) => ({
  producers: [],
  selectedProducer: null,
  loading: false,
  error: null,

  fetchProducers: async () => {
    try {
      set({ loading: true, error: null });

      const { useConfigStore } = await import('./configStore');
      const config = useConfigStore.getState().config;

      if (!config) {
        throw new Error('Configuration not loaded');
      }

      const response = await fetch(`${config.api.baseUrl}/producers`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.ok && data.data) {
        await AsyncStorage.setItem(PRODUCERS_STORAGE_KEY, JSON.stringify(data.data));
        set({ producers: data.data, error: null });
      } else {
        throw new Error(data.message || 'Failed to fetch producers');
      }
    } catch (error) {
      console.error('❌ Fetch producers error:', error);
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  fetchProducerById: async (id: string) => {
    try {
      set({ loading: true, error: null });

      const { useConfigStore } = await import('./configStore');
      const config = useConfigStore.getState().config;

      if (!config) {
        throw new Error('Configuration not loaded');
      }

      const response = await fetch(`${config.api.baseUrl}/producers/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.ok && data.data) {
        set({ selectedProducer: data.data, error: null });
      } else {
        throw new Error(data.message || 'Failed to fetch producer');
      }
    } catch (error) {
      console.error('❌ Fetch producer error:', error);
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  registerProducer: async (data) => {
    try {
      set({ loading: true, error: null });

      const { useConfigStore } = await import('./configStore');
      const { useAuthStore } = await import('./authStore');
      const config = useConfigStore.getState().config;
      const token = useAuthStore.getState().token;

      if (!config || !token) {
        throw new Error('Not authenticated or config not loaded');
      }

      const response = await fetch(`${config.api.baseUrl}/producers/register`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (responseData.ok) {
        set({ error: null });
        return true;
      } else {
        throw new Error(responseData.message || 'Failed to register producer');
      }
    } catch (error) {
      console.error('❌ Register producer error:', error);
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  setSelectedProducer: (producer) => set({ selectedProducer: producer }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));

