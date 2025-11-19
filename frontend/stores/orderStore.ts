import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useConfigStore } from './configStore';
import { ToastManager } from '../utils/ToastManager';

// Types
export interface OrderItem {
  id: string;
  type: 'plate' | 'custom';
  plateId?: string;
  customIngredients?: string[];
  quantity: number;
  price: number;
  name: string;
  image?: string;
}

export interface Order {
  id: string;
  items: OrderItem[];
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod?: string;
  paymentId?: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface PaymentIntent {
  paymentIntentId: string;
  clientSecret: string;
  amount: number;
  currency: string;
}

interface OrderState {
  // State
  currentOrder: Order | null;
  userOrders: Order[];
  paymentIntent: PaymentIntent | null;
  isCreatingOrder: boolean;
  isProcessingPayment: boolean;
  isLoadingOrders: boolean;
  error: string | null;

  // Actions - NEW PAYMENT-FIRST FLOW
  createPaymentIntent: (cartItems: OrderItem[], userId: string, customerEmail?: string, notes?: string) => Promise<PaymentIntent | null>;
  completePayment: (paymentIntentId: string, cartItems: OrderItem[], userId: string, customerEmail?: string, notes?: string) => Promise<Order | null>;
  getUserOrders: (userId: string) => Promise<void>;
  getOrder: (orderId: string) => Promise<Order | null>;
  clearCurrentOrder: () => void;
  clearError: () => void;
  clearPaymentIntent: () => void;
}

export const useOrderStore = create<OrderState>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentOrder: null,
      userOrders: [],
      paymentIntent: null,
      isCreatingOrder: false,
      isProcessingPayment: false,
      isLoadingOrders: false,
      error: null,

      // Actions - NEW PAYMENT-FIRST FLOW
      createPaymentIntent: async (cartItems, userId, customerEmail, notes) => {
        try {
          set({ isCreatingOrder: true, error: null });

          const config = useConfigStore.getState().config;
          if (!config) {
            throw new Error('Configuration not loaded');
          }

          // Get auth headers with JWT token
          const AuthService = await import('../services/authService');
          const authHeaders = await AuthService.default.getAuthHeaders();

          // Calculate total amount
          const totalAmount = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);

          console.log('💳 Creating payment intent for cart items:', cartItems.length, 'Total:', totalAmount);

          const response = await fetch(`${config.api.baseUrl}/stripe/create-payment-intent`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
              amount: Math.round(totalAmount * 100), // Convert to cents
              currency: 'usd',
              metadata: {
                userId,
                cartItems: JSON.stringify(cartItems),
                customerEmail: customerEmail || '',
                notes: notes || ''
              }
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to create payment intent');
          }

          const data = await response.json();

          if (data.ok) {
            const paymentIntent: PaymentIntent = {
              paymentIntentId: data.data.paymentIntentId,
              clientSecret: data.data.clientSecret,
              amount: data.data.amount,
              currency: data.data.currency
            };

            set({ paymentIntent, isCreatingOrder: false });
            console.log('💳 Payment intent created successfully:', paymentIntent.paymentIntentId);
            ToastManager.success('Payment ready! Complete your purchase.');
            return paymentIntent;
          } else {
            throw new Error(data.message || 'Payment setup failed');
          }

        } catch (error) {
          console.error('❌ Payment intent creation error:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to setup payment',
            isCreatingOrder: false 
          });
          ToastManager.error('Failed to setup payment');
          return null;
        }
      },

      completePayment: async (paymentIntentId, cartItems, userId, customerEmail, notes) => {
        try {
          set({ isProcessingPayment: true, error: null });

          const config = useConfigStore.getState().config;
          if (!config) {
            throw new Error('Configuration not loaded');
          }

          // Get auth headers with JWT token
          const AuthService = await import('../services/authService');
          const authHeaders = await AuthService.default.getAuthHeaders();

          console.log('🎯 Completing payment and creating order:', paymentIntentId);

          const response = await fetch(`${config.api.baseUrl}/payment/complete`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
              paymentIntentId,
              cartItems,
              customerEmail,
              notes
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to complete payment');
          }

          const data = await response.json();

          if (data.ok) {
            const order: Order = {
              id: data.data.orderId,
              items: cartItems,
              totalPrice: data.data.totalPrice,
              status: data.data.status,
              paymentStatus: data.data.paymentStatus,
              paymentMethod: 'stripe',
              paymentId: paymentIntentId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              notes: notes || undefined,
            };

            set({ currentOrder: order, isProcessingPayment: false });
            console.log('✅ Payment completed and order created:', order.id);
            ToastManager.success('Payment successful! Order confirmed');
            return order;
          } else {
            throw new Error(data.message || 'Payment completion failed');
          }

        } catch (error) {
          console.error('❌ Payment completion error:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to complete payment',
            isProcessingPayment: false 
          });
          ToastManager.error('Failed to complete payment');
          return null;
        }
      },

      getUserOrders: async (userId: string) => {
        try {
          set({ isLoadingOrders: true, error: null });

          const config = useConfigStore.getState().config;
          if (!config) {
            throw new Error('Configuration not loaded');
          }

          const response = await fetch(`${config.api.baseUrl}/orders/user/${userId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error('Failed to fetch orders');
          }

          const data = await response.json();

          if (data.ok) {
            const orders: Order[] = data.data.map((orderData: any) => ({
              id: orderData.id,
              items: orderData.items,
              totalPrice: orderData.totalPrice,
              status: orderData.status,
              paymentStatus: orderData.paymentStatus,
              paymentMethod: orderData.paymentMethod,
              paymentId: orderData.paymentId,
              createdAt: orderData.createdAt,
              updatedAt: orderData.updatedAt,
              notes: orderData.notes,
            }));

            set({ userOrders: orders, isLoadingOrders: false });
            console.log('✅ User orders loaded:', orders.length);
          } else {
            throw new Error(data.message || 'Failed to load orders');
          }

        } catch (error) {
          console.error('❌ Get user orders error:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load orders',
            isLoadingOrders: false 
          });
        }
      },

      getOrder: async (orderId: string) => {
        try {
          const config = useConfigStore.getState().config;
          if (!config) {
            throw new Error('Configuration not loaded');
          }

          // First check if order is in userOrders
          const { userOrders } = get();
          const existingOrder = userOrders.find(order => order.id === orderId);
          if (existingOrder) {
            return existingOrder;
          }

          // Fetch from API if not found locally
          const response = await fetch(`${config.api.baseUrl}/orders/${orderId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error('Order not found');
          }

          const data = await response.json();

          if (data.ok) {
            const order: Order = {
              id: data.data.id,
              items: data.data.items,
              totalPrice: data.data.totalPrice,
              status: data.data.status,
              paymentStatus: data.data.paymentStatus,
              paymentMethod: data.data.paymentMethod,
              paymentId: data.data.paymentId,
              createdAt: data.data.createdAt,
              updatedAt: data.data.updatedAt,
              notes: data.data.notes,
            };

            console.log('✅ Order loaded:', order.id);
            return order;
          }

          return null;
        } catch (error) {
          console.error('❌ Get order error:', error);
          return null;
        }
      },

      clearCurrentOrder: () => set({ currentOrder: null }),
      clearError: () => set({ error: null }),
      clearPaymentIntent: () => set({ paymentIntent: null }),
    }),
    {
      name: 'order-store',
    }
  )
);