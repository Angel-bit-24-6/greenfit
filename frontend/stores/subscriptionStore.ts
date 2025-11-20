import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SubscriptionPlan = 'BASIC' | 'STANDARD' | 'PREMIUM';

interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  limitInKg: number;
  usedKg: number;
  renewalDate: string;
  isActive: boolean;
}

interface SubscriptionState {
  subscription: Subscription | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchCurrentSubscription: () => Promise<void>;
  changePlan: (planId: SubscriptionPlan) => Promise<boolean>;
  getRemainingKg: () => number;
  getUsedKg: () => number;
  canAddProduct: (weightInKg: number) => boolean;
  validateCategory: (category: string) => boolean;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const SUBSCRIPTION_STORAGE_KEY = 'nutrifresco_subscription';

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  subscription: null,
  loading: false,
  error: null,

  fetchCurrentSubscription: async () => {
    try {
      set({ loading: true, error: null });

      const { useConfigStore } = await import('./configStore');
      const { useAuthStore } = await import('./authStore');
      const config = useConfigStore.getState().config;
      const token = useAuthStore.getState().token;

      if (!config || !token) {
        throw new Error('Not authenticated or config not loaded');
      }

      const response = await fetch(`${config.api.baseUrl}/subscription/current`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.ok && data.data) {
        await AsyncStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(data.data));
        set({ subscription: data.data, error: null });
      } else {
        throw new Error(data.message || 'Failed to fetch subscription');
      }
    } catch (error) {
      console.error('❌ Fetch subscription error:', error);
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  changePlan: async (plan: SubscriptionPlan) => {
    try {
      set({ loading: true, error: null });

      const { useConfigStore } = await import('./configStore');
      const { useAuthStore } = await import('./authStore');
      const config = useConfigStore.getState().config;
      const token = useAuthStore.getState().token;

      if (!config || !token) {
        throw new Error('Not authenticated or config not loaded');
      }

      const response = await fetch(`${config.api.baseUrl}/subscription/change`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan }),
      });

      const data = await response.json();

      if (data.ok && data.data) {
        await AsyncStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(data.data));
        set({ subscription: data.data, error: null });
        return true;
      } else {
        throw new Error(data.message || 'Failed to change plan');
      }
    } catch (error) {
      console.error('❌ Change plan error:', error);
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  getRemainingKg: () => {
    const { subscription } = get();
    if (!subscription) return 0;
    return Math.max(0, subscription.limitInKg - subscription.usedKg);
  },

  getUsedKg: () => {
    const { subscription } = get();
    return subscription?.usedKg || 0;
  },

  canAddProduct: (weightInKg: number) => {
    const { subscription } = get();
    if (!subscription || !subscription.isActive) return false;
    const remaining = subscription.limitInKg - subscription.usedKg;
    return remaining >= weightInKg;
  },

  validateCategory: (category: string) => {
    const { subscription } = get();
    if (!subscription) return false;

    const basicCategories = ['FRUITS', 'VEGETABLES'];
    const standardCategories = [...basicCategories, 'LEGUMES', 'HERBS', 'SNACKS', 'COFFEE', 'CHOCOLATE'];
    const premiumCategories = [...standardCategories, 'PROTEINS'];

    switch (subscription.plan) {
      case 'BASIC':
        return basicCategories.includes(category);
      case 'STANDARD':
        return standardCategories.includes(category);
      case 'PREMIUM':
        return premiumCategories.includes(category);
      default:
        return false;
    }
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));

