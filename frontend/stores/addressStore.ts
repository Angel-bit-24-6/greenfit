import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DeliveryAddress {
  id: string;
  street: string;
  number: string;
  neighborhood: string;
  postalCode: string;
  city: string;
  state: string;
  contactPhone: string;
  references?: string;
  isFavorite: boolean;
  createdAt: string;
}

interface AddressState {
  addresses: DeliveryAddress[];
  selectedAddress: DeliveryAddress | null;
  loading: boolean;
  error: string | null;

  // Actions
  addAddress: (address: Omit<DeliveryAddress, 'id' | 'createdAt'>) => Promise<boolean>;
  updateAddress: (id: string, address: Partial<DeliveryAddress>) => Promise<boolean>;
  deleteAddress: (id: string) => Promise<boolean>;
  setFavorite: (id: string, isFavorite: boolean) => Promise<boolean>;
  selectAddress: (id: string | null) => void;
  loadAddresses: () => Promise<void>;
  getFavoriteAddresses: () => DeliveryAddress[];
}

const ADDRESSES_STORAGE_KEY = 'nutrifresco_addresses';

export const useAddressStore = create<AddressState>((set, get) => ({
  addresses: [],
  selectedAddress: null,
  loading: false,
  error: null,

  loadAddresses: async () => {
    try {
      set({ loading: true, error: null });
      const stored = await AsyncStorage.getItem(ADDRESSES_STORAGE_KEY);
      if (stored) {
        const addresses = JSON.parse(stored);
        set({ addresses, error: null });
      }
    } catch (error) {
      console.error('❌ Load addresses error:', error);
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  addAddress: async (address) => {
    try {
      set({ loading: true, error: null });
      const newAddress: DeliveryAddress = {
        ...address,
        id: `addr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
      };

      const updatedAddresses = [...get().addresses, newAddress];
      await AsyncStorage.setItem(ADDRESSES_STORAGE_KEY, JSON.stringify(updatedAddresses));
      set({ addresses: updatedAddresses, error: null });
      return true;
    } catch (error) {
      console.error('❌ Add address error:', error);
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  updateAddress: async (id, updates) => {
    try {
      set({ loading: true, error: null });
      const updatedAddresses = get().addresses.map(addr =>
        addr.id === id ? { ...addr, ...updates } : addr
      );
      await AsyncStorage.setItem(ADDRESSES_STORAGE_KEY, JSON.stringify(updatedAddresses));
      set({ addresses: updatedAddresses, error: null });
      
      // Update selected address if it was the one updated
      if (get().selectedAddress?.id === id) {
        set({ selectedAddress: updatedAddresses.find(addr => addr.id === id) || null });
      }
      return true;
    } catch (error) {
      console.error('❌ Update address error:', error);
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  deleteAddress: async (id) => {
    try {
      set({ loading: true, error: null });
      const updatedAddresses = get().addresses.filter(addr => addr.id !== id);
      await AsyncStorage.setItem(ADDRESSES_STORAGE_KEY, JSON.stringify(updatedAddresses));
      set({ addresses: updatedAddresses, error: null });
      
      // Clear selected address if it was deleted
      if (get().selectedAddress?.id === id) {
        set({ selectedAddress: null });
      }
      return true;
    } catch (error) {
      console.error('❌ Delete address error:', error);
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  setFavorite: async (id, isFavorite) => {
    return get().updateAddress(id, { isFavorite });
  },

  selectAddress: (id) => {
    if (!id) {
      set({ selectedAddress: null });
      return;
    }
    const address = get().addresses.find(addr => addr.id === id);
    set({ selectedAddress: address || null });
  },

  getFavoriteAddresses: () => {
    return get().addresses.filter(addr => addr.isFavorite);
  },
}));

