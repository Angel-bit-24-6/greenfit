import AsyncStorage from '@react-native-async-storage/async-storage';
import { useConfigStore } from '../stores/configStore';

export interface AuthResponse {
  ok: boolean;
  message: string;
  data?: {
    user: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
      role: string;
      preferences: any;
      createdAt: string;
      updatedAt: string;
    };
    token: string;
  };
  error?: string;
}

export interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
  subscriptionPlan?: 'BASIC' | 'STANDARD' | 'PREMIUM';
}

export interface LoginData {
  email: string;
  password: string;
}

class AuthService {
  private static TOKEN_KEY = 'greenfit_auth_token';
  private static USER_KEY = 'greenfit_user_data';

  /**
   * Register new user
   */
  static async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      const config = useConfigStore.getState().config;
      if (!config) {
        throw new Error('Configuration not loaded');
      }

      const response = await fetch(`${config.api.baseUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data: AuthResponse = await response.json();

      if (data.ok && data.data) {
        // Store token and user data
        await AsyncStorage.setItem(this.TOKEN_KEY, data.data.token);
        await AsyncStorage.setItem(this.USER_KEY, JSON.stringify(data.data.user));
        
        console.log('✅ User registered and logged in:', data.data.user.email);
      }

      return data;
    } catch (error) {
      console.error('❌ Registration error:', error);
      return {
        ok: false,
        message: 'Registration failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Login user
   */
  static async login(credentials: LoginData): Promise<AuthResponse> {
    try {
      const config = useConfigStore.getState().config;
      if (!config) {
        throw new Error('Configuration not loaded');
      }

      const response = await fetch(`${config.api.baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data: AuthResponse = await response.json();

      if (data.ok && data.data) {
        // Store token and user data
        await AsyncStorage.setItem(this.TOKEN_KEY, data.data.token);
        await AsyncStorage.setItem(this.USER_KEY, JSON.stringify(data.data.user));
        
        console.log('✅ User logged in:', data.data.user.email);
      }

      return data;
    } catch (error) {
      console.error('❌ Login error:', error);
      return {
        ok: false,
        message: 'Login failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Logout user
   */
  static async logout(): Promise<void> {
    try {
      const config = useConfigStore.getState().config;
      const token = await this.getStoredToken();

      if (config && token) {
        // Call backend logout endpoint
        await fetch(`${config.api.baseUrl}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }

      // Clear stored data
      await AsyncStorage.removeItem(this.TOKEN_KEY);
      await AsyncStorage.removeItem(this.USER_KEY);
      
      console.log('✅ User logged out');
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Still clear local data even if backend call fails
      await AsyncStorage.removeItem(this.TOKEN_KEY);
      await AsyncStorage.removeItem(this.USER_KEY);
    }
  }

  /**
   * Get stored authentication token
   */
  static async getStoredToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.TOKEN_KEY);
    } catch (error) {
      console.error('❌ Error getting stored token:', error);
      return null;
    }
  }

  /**
   * Get stored user data
   */
  static async getStoredUser(): Promise<any | null> {
    try {
      const userData = await AsyncStorage.getItem(this.USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('❌ Error getting stored user:', error);
      return null;
    }
  }

  /**
   * Get current user profile from backend
   */
  static async getProfile(): Promise<AuthResponse> {
    try {
      const config = useConfigStore.getState().config;
      const token = await this.getStoredToken();

      if (!config || !token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${config.api.baseUrl}/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.ok && data.data) {
        // Update stored user data
        await AsyncStorage.setItem(this.USER_KEY, JSON.stringify(data.data));
      }

      return data;
    } catch (error) {
      console.error('❌ Get profile error:', error);
      return {
        ok: false,
        message: 'Failed to get profile',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if user is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    const token = await this.getStoredToken();
    const user = await this.getStoredUser();
    return !!(token && user);
  }

  /**
   * Update user profile
   */
  static async updateProfile(updates: {
    name?: string;
    phone?: string;
    preferences?: any;
  }): Promise<AuthResponse> {
    try {
      const config = useConfigStore.getState().config;
      const token = await this.getStoredToken();

      if (!config || !token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${config.api.baseUrl}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (data.ok && data.data) {
        // Update stored user data
        await AsyncStorage.setItem(this.USER_KEY, JSON.stringify(data.data));
        console.log('✅ Profile updated:', data.data.email);
      }

      return data;
    } catch (error) {
      console.error('❌ Update profile error:', error);
      return {
        ok: false,
        message: 'Failed to update profile',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get authorization header for API calls
   */
  static async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getStoredToken();
    
    if (token) {
      return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
    }
    
    return {
      'Content-Type': 'application/json',
    };
  }
}

export default AuthService;