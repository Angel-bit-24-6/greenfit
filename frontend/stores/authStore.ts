import { create } from 'zustand';
import { User } from '../types/domain';
import AuthService from '../services/authService';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  isInitialized: boolean;
  
  // Actions
  login: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  isInitialized: false,

  login: async (user, token) => {
    console.log('🔐 User logged in to store:', user.email);
    set({
      user,
      token,
      isAuthenticated: true,
      error: null,
      loading: false,
      isInitialized: true
    });
    
    // Load theme preferences from backend after login
    try {
      const { loadPreferencesFromBackend } = require('./themeStore').useThemeStore.getState();
      await loadPreferencesFromBackend();
    } catch (error) {
      console.error('❌ Error loading theme preferences after login:', error);
    }

    // Load subscription after login (only for customers)
    if (user.role === 'customer' || !user.role) {
      try {
        const { fetchCurrentSubscription } = require('./subscriptionStore').useSubscriptionStore.getState();
        await fetchCurrentSubscription();
      } catch (error) {
        console.error('❌ Error loading subscription after login:', error);
      }
    }
  },

  logout: async () => {
    console.log('🔐 Logging out user...');
    
    // Call AuthService logout to clear storage and notify backend
    await AuthService.logout();
    
    // Clear subscription store (only if it exists)
    try {
      const { useSubscriptionStore } = await import('./subscriptionStore');
      useSubscriptionStore.setState({ subscription: null, error: null });
    } catch (error) {
      console.log('Subscription store not available');
    }
    
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
      loading: false,
      isInitialized: true
    });
    
    console.log('✅ Logout completed - isAuthenticated:', false);
  },

  initializeAuth: async () => {
    try {
      set({ loading: true });

      const isAuth = await AuthService.isAuthenticated();
      
      if (isAuth) {
        const user = await AuthService.getStoredUser();
        const token = await AuthService.getStoredToken();
        
        if (user && token) {
          console.log('🔐 Restored user session:', user.email);
          set({
            user,
            token,
            isAuthenticated: true,
            error: null,
            loading: false,
            isInitialized: true
          });
          return;
        }
      }

      // No valid session found
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        error: null,
        loading: false,
        isInitialized: true
      });

    } catch (error) {
      console.error('❌ Auth initialization error:', error);
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        error: error instanceof Error ? error.message : 'Auth initialization failed',
        loading: false,
        isInitialized: true
      });
    }
  },

  refreshProfile: async () => {
    try {
      const response = await AuthService.getProfile();
      
      if (response.ok && response.data) {
        console.log('🔐 Profile refreshed:', response.data.email);
        set({
          user: response.data,
          error: null
        });
        
        // Load theme preferences from backend after profile refresh
        const { loadPreferencesFromBackend } = require('./themeStore').useThemeStore.getState();
        await loadPreferencesFromBackend();

        // También recargar suscripción al refrescar perfil (only for customers)
        if (response.data.role === 'customer' || !response.data.role) {
          try {
            const { fetchCurrentSubscription } = require('./subscriptionStore').useSubscriptionStore.getState();
            await fetchCurrentSubscription();
          } catch (error) {
            console.error('❌ Error loading subscription after refresh:', error);
          }
        }
      } else {
        // Profile fetch failed, might be token expired
        console.log('❌ Profile refresh failed, logging out');
        await get().logout();
      }
    } catch (error) {
      console.error('❌ Profile refresh error:', error);
      await get().logout();
    }
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));