import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from './authStore';
import { useConfigStore } from './configStore';
import AuthService from '../services/authService';

export type ColorMode = 'dark' | 'light';

export interface ThemeColors {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryGlow: string;
  background: string;
  backgroundSecondary: string;
  surface: string;
  surfaceElevated: string;
  surfaceCard: string;
  text: string;
  textSecondary: string;
  border: string;
  error: string;
}

export interface Theme {
  id: string;
  name: string;
  colors: {
    dark: ThemeColors;
    light: ThemeColors;
  };
  emoji: string;
}

// Helper function to create theme colors
const createThemeColors = (
  primary: string,
  primaryDark: string,
  primaryLight: string,
  primaryGlow: string,
  isDark: boolean
): ThemeColors => {
  if (isDark) {
    return {
      primary,
      primaryDark,
      primaryLight,
      primaryGlow,
      background: '#0a0a0a',
      backgroundSecondary: '#111111',
      surface: 'rgba(255, 255, 255, 0.08)',
      surfaceElevated: 'rgba(255, 255, 255, 0.12)',
      surfaceCard: primaryGlow.replace('0.3', '0.1'),
      text: '#ffffff',
      textSecondary: 'rgba(255, 255, 255, 0.65)',
      border: primaryGlow.replace('0.3', '0.25'),
      error: '#ff6b6b',
    };
  } else {
    return {
      primary,
      primaryDark,
      primaryLight,
      primaryGlow,
      background: '#ffffff',
      backgroundSecondary: '#f5f5f5',
      surface: 'rgba(0, 0, 0, 0.05)',
      surfaceElevated: 'rgba(0, 0, 0, 0.08)',
      surfaceCard: primaryGlow.replace('0.3', '0.15'),
      text: '#1a1a1a',
      textSecondary: 'rgba(0, 0, 0, 0.65)',
      border: primaryGlow.replace('0.3', '0.3'),
      error: '#ff6b6b',
    };
  }
};

// Predefined themes with dark and light variants
export const PREDEFINED_THEMES: Theme[] = [
  {
    id: 'green',
    name: 'Verde Natural',
    emoji: '🌱',
    colors: {
      dark: createThemeColors(
        '#80f269',
        '#6dd855',
        '#a5f892',
        'rgba(128, 242, 105, 0.3)',
        true
      ),
      light: createThemeColors(
        '#80f269',
        '#6dd855',
        '#a5f892',
        'rgba(128, 242, 105, 0.3)',
        false
      ),
    },
  },
  {
    id: 'purple',
    name: 'Púrpura Vibrante',
    emoji: '💜',
    colors: {
      dark: createThemeColors(
        '#9365b8',
        '#7d4fa0',
        '#b085d0',
        'rgba(147, 101, 184, 0.3)',
        true
      ),
      light: createThemeColors(
        '#9365b8',
        '#7d4fa0',
        '#b085d0',
        'rgba(147, 101, 184, 0.3)',
        false
      ),
    },
  },
  {
    id: 'cyan',
    name: 'Cian Refrescante',
    emoji: '💎',
    colors: {
      dark: createThemeColors(
        '#6dd8d8',
        '#5bc4c4',
        '#8ee8e8',
        'rgba(109, 216, 216, 0.3)',
        true
      ),
      light: createThemeColors(
        '#6dd8d8',
        '#5bc4c4',
        '#8ee8e8',
        'rgba(109, 216, 216, 0.3)',
        false
      ),
    },
  },
  {
    id: 'blue',
    name: 'Azul Profundo',
    emoji: '🌊',
    colors: {
      dark: createThemeColors(
        '#0d99d5',
        '#0b7fb3',
        '#3db3e5',
        'rgba(13, 153, 213, 0.3)',
        true
      ),
      light: createThemeColors(
        '#0d99d5',
        '#0b7fb3',
        '#3db3e5',
        'rgba(13, 153, 213, 0.3)',
        false
      ),
    },
  },
  {
    id: 'pink',
    name: 'Rosa Brillante',
    emoji: '🌸',
    colors: {
      dark: createThemeColors(
        '#e55fe3',
        '#d045ce',
        '#f079ed',
        'rgba(229, 95, 227, 0.3)',
        true
      ),
      light: createThemeColors(
        '#e55fe3',
        '#d045ce',
        '#f079ed',
        'rgba(229, 95, 227, 0.3)',
        false
      ),
    },
  },
];

const THEME_STORAGE_KEY = 'greenfit_selected_theme';
const COLOR_MODE_STORAGE_KEY = 'greenfit_color_mode';

interface ThemeState {
  currentTheme: Theme;
  colorMode: ColorMode;
  themes: Theme[];
  
  // Actions
  setTheme: (themeId: string) => Promise<void>;
  setColorMode: (mode: ColorMode) => Promise<void>;
  initializeTheme: () => Promise<void>;
  getThemeColors: () => ThemeColors;
  savePreferencesToBackend: () => Promise<void>;
  loadPreferencesFromBackend: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  currentTheme: PREDEFINED_THEMES[0], // Default to green
  colorMode: 'dark', // Default to dark
  themes: PREDEFINED_THEMES,

  setTheme: async (themeId: string) => {
    const theme = PREDEFINED_THEMES.find(t => t.id === themeId) || PREDEFINED_THEMES[0];
    set({ currentTheme: theme });
    
    // Persist to storage
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, themeId);
      // Save to backend if authenticated
      await get().savePreferencesToBackend();
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  },

  setColorMode: async (mode: ColorMode) => {
    set({ colorMode: mode });
    
    // Persist to storage
    try {
      await AsyncStorage.setItem(COLOR_MODE_STORAGE_KEY, mode);
      // Save to backend if authenticated
      await get().savePreferencesToBackend();
    } catch (error) {
      console.error('Error saving color mode:', error);
    }
  },

  initializeTheme: async () => {
    try {
      // First try to load from backend if authenticated
      const { isAuthenticated } = useAuthStore.getState();
      if (isAuthenticated) {
        await get().loadPreferencesFromBackend();
        return;
      }

      // Fallback to local storage
      const savedThemeId = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      const savedColorMode = await AsyncStorage.getItem(COLOR_MODE_STORAGE_KEY) as ColorMode | null;
      
      if (savedThemeId) {
        const theme = PREDEFINED_THEMES.find(t => t.id === savedThemeId) || PREDEFINED_THEMES[0];
        set({ currentTheme: theme });
      }
      
      if (savedColorMode === 'dark' || savedColorMode === 'light') {
        set({ colorMode: savedColorMode });
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  },

  getThemeColors: () => {
    const { currentTheme, colorMode } = get();
    return currentTheme.colors[colorMode];
  },

  savePreferencesToBackend: async () => {
    try {
      const { isAuthenticated, user } = useAuthStore.getState();
      if (!isAuthenticated || !user) {
        return; // Not authenticated, skip backend save
      }

      const config = useConfigStore.getState().config;
      if (!config) {
        console.warn('Config not loaded, skipping backend save');
        return;
      }

      const token = await AuthService.getStoredToken();
      if (!token) {
        return;
      }

      const { currentTheme, colorMode } = get();
      
      // Get current preferences and merge with theme preferences
      const currentPreferences = user.preferences || {};
      const updatedPreferences = {
        ...currentPreferences,
        theme: {
          themeId: currentTheme.id,
          colorMode: colorMode,
        },
      };

      const response = await fetch(`${config.api.baseUrl}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preferences: updatedPreferences,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.data) {
          // Update user in auth store
          useAuthStore.getState().login(data.data, token);
          console.log('✅ Theme preferences saved to backend');
        }
      } else {
        console.error('❌ Failed to save theme preferences to backend');
      }
    } catch (error) {
      console.error('❌ Error saving theme preferences to backend:', error);
    }
  },

  loadPreferencesFromBackend: async () => {
    try {
      const { isAuthenticated } = useAuthStore.getState();
      if (!isAuthenticated) {
        return; // Not authenticated, skip backend load
      }

      const config = useConfigStore.getState().config;
      if (!config) {
        console.warn('Config not loaded, skipping backend load');
        return;
      }

      const token = await AuthService.getStoredToken();
      if (!token) {
        return;
      }

      const response = await fetch(`${config.api.baseUrl}/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.data && data.data.preferences) {
          const preferences = data.data.preferences;
          
          // Load theme preferences
          if (preferences.theme) {
            const { themeId, colorMode } = preferences.theme;
            
            if (themeId) {
              const theme = PREDEFINED_THEMES.find(t => t.id === themeId) || PREDEFINED_THEMES[0];
              set({ currentTheme: theme });
              await AsyncStorage.setItem(THEME_STORAGE_KEY, themeId);
            }
            
            if (colorMode === 'dark' || colorMode === 'light') {
              set({ colorMode });
              await AsyncStorage.setItem(COLOR_MODE_STORAGE_KEY, colorMode);
            }
          }
          
          console.log('✅ Theme preferences loaded from backend');
        }
      }
    } catch (error) {
      console.error('❌ Error loading theme preferences from backend:', error);
      // Fallback to local storage
      const savedThemeId = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      const savedColorMode = await AsyncStorage.getItem(COLOR_MODE_STORAGE_KEY) as ColorMode | null;
      
      if (savedThemeId) {
        const theme = PREDEFINED_THEMES.find(t => t.id === savedThemeId) || PREDEFINED_THEMES[0];
        set({ currentTheme: theme });
      }
      
      if (savedColorMode === 'dark' || savedColorMode === 'light') {
        set({ colorMode: savedColorMode });
      }
    }
  },
}));
