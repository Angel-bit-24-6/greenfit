import { create } from 'zustand';
import { AppConfig, ThemeConfig } from '../types/config';

interface ConfigState {
  appConfig: AppConfig | null;
  themeConfig: ThemeConfig | null;
  config: any | null; // Combined config for compatibility
  loading: boolean;
  error: string | null;
  
  // Actions
  setAppConfig: (config: AppConfig) => void;
  setThemeConfig: (config: ThemeConfig) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  appConfig: null,
  themeConfig: null,
  config: null,
  loading: false,
  error: null,

  setAppConfig: (config) => {
    set({ appConfig: config });
    // Update combined config
    const state = get();
    set({ 
      config: {
        api: state.appConfig?.api,
        theme: state.themeConfig,
        app: state.appConfig?.app
      }
    });
  },
  setThemeConfig: (config) => {
    set({ themeConfig: config });
    // Update combined config
    const state = get();
    set({ 
      config: {
        api: state.appConfig?.api,
        theme: state.themeConfig,
        app: state.appConfig?.app
      }
    });
  },
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  reset: () => set({
    appConfig: null,
    themeConfig: null,
    config: null,
    loading: false,
    error: null
  })
}));