import AsyncStorage from '@react-native-async-storage/async-storage';
import { useConfigStore } from '../stores/configStore';

export interface ProducerOrderItem {
  id: string;
  productName: string;
  quantity: number;
  weightInKg: number;
  product: {
    id: string;
    name: string;
    category: string;
    weightInKg: number;
    image?: string;
  };
}

export interface ProducerOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  date: string;
  items: ProducerOrderItem[];
  totalWeightInKg: number;
  notes?: string;
}

export interface ProducerOrderResponse {
  ok: boolean;
  message?: string;
  data?: ProducerOrder[];
}

export interface UpdateOrderStatusResponse {
  ok: boolean;
  message?: string;
  data?: any;
}

class ProducerOrderService {
  private async getAuthToken(): Promise<string | null> {
    return await AsyncStorage.getItem('greenfit_auth_token');
  }

  private getApiUrl(): string {
    const config = useConfigStore.getState().config;
    if (!config) {
      throw new Error('Configuration not loaded');
    }
    return config.api.baseUrl;
  }

  /**
   * Obtener pedidos del productor
   */
  async getMyOrders(): Promise<ProducerOrderResponse> {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        return {
          ok: false,
          message: 'No authenticated',
        };
      }

      const apiUrl = this.getApiUrl();
      const response = await fetch(`${apiUrl}/orders/producer/my-orders`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          ok: false,
          message: data.message || 'Failed to fetch orders',
        };
      }

      return {
        ok: true,
        data: data.data,
      };
    } catch (error) {
      console.error('❌ Error fetching producer orders:', error);
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Actualizar estado de un pedido
   */
  async updateOrderStatus(orderId: string, status: string): Promise<UpdateOrderStatusResponse> {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        return {
          ok: false,
          message: 'No authenticated',
        };
      }

      const apiUrl = this.getApiUrl();
      const response = await fetch(`${apiUrl}/orders/producer/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          ok: false,
          message: data.message || 'Failed to update order status',
        };
      }

      return {
        ok: true,
        message: data.message,
        data: data.data,
      };
    } catch (error) {
      console.error('❌ Error updating order status:', error);
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export default new ProducerOrderService();

