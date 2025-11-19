import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useCartStore } from '../stores/cartStore';
import { useOrderStore } from '../stores/orderStore';
import { useAuthStore } from '../stores/authStore';
import { useConfigStore } from '../stores/configStore';
import { ToastManager } from '../utils/ToastManager';
import { Button } from '../components/ui/Button';

interface SimpleCheckoutScreenProps {
  navigation: any;
}

const SimpleCheckoutScreen: React.FC<SimpleCheckoutScreenProps> = ({ navigation }) => {
  const { cart, clearCart } = useCartStore();
  const { 
    currentOrder, 
    paymentIntent, 
    isCreatingOrder, 
    isProcessingPayment,
    createOrder, 
    createPaymentIntent, 
    confirmPayment: confirmOrderPayment,
    clearCurrentOrder,
    clearPaymentIntent 
  } = useOrderStore();
  const { user } = useAuthStore();
  const { config } = useConfigStore();

  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState<'order' | 'payment' | 'success'>('order');

  // Calculate total from cart
  const totalPrice = cart?.items?.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0;

  useEffect(() => {
    if (user?.email) {
      setCustomerEmail(user.email);
    }
  }, [user]);

  const handleCreateOrder = async () => {
    if (!user) {
      ToastManager.error('Please log in to place an order');
      return;
    }

    if (!cart?.items || cart.items.length === 0) {
      ToastManager.error('Cart is empty');
      return;
    }

    // Convert cart items to order items
    const orderItems = cart.items.map(item => ({
      id: item.id,
      type: item.type as 'plate' | 'custom',
      plateId: item.plateId,
      customIngredients: item.customIngredients,
      quantity: item.quantity,
      price: item.price,
      name: item.name,
      image: item.image,
    }));

    console.log('🔍 Creating order with items:');
    console.log(JSON.stringify(orderItems, null, 2));
    console.log('🔍 User ID:', user.id);
    console.log('🔍 Customer email:', customerEmail);
    console.log('🔍 Notes:', notes);

    const order = await createOrder(
      orderItems,
      user.id,
      customerEmail || undefined,
      notes || undefined
    );

    if (order) {
      console.log('Order created successfully:', order.id);
      setStep('payment');
      
      // Create payment intent for the order
      const intent = await createPaymentIntent(order.id);
      if (intent) {
        console.log('Payment intent created:', intent.paymentIntentId);
        ToastManager.success('Order created! Ready for payment.');
      } else {
        ToastManager.error('Failed to setup payment');
      }
    }
  };

  const handleMockPayment = async () => {
    if (!paymentIntent || !currentOrder) {
      ToastManager.error('Payment not ready');
      return;
    }

    Alert.alert(
      'Test Payment',
      'This is a test payment. In production, you would enter your card details here.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Simulate Success',
          onPress: async () => {
            try {
              // Simulate successful payment by calling our backend directly
              const config = useConfigStore.getState().config;
              if (!config) {
                throw new Error('Configuration not loaded');
              }

              // For testing, we'll simulate a successful Stripe payment
              const mockPaymentIntentId = 'pi_test_' + Date.now();
              
              const response = await fetch(`${config.api.baseUrl}/orders/confirm-payment`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  paymentIntentId: mockPaymentIntentId,
                  orderId: currentOrder.id,
                }),
              });

              const data = await response.json();

              if (data.ok) {
                // Clear cart and navigate to success
                clearCart();
                clearCurrentOrder();
                clearPaymentIntent();
                setStep('success');
                
                ToastManager.success('Payment Successful! Order confirmed.');
                
                setTimeout(() => {
                  navigation.navigate('Main', { screen: 'MenuTab' });
                }, 3000);
              } else {
                ToastManager.error('Payment confirmation failed');
              }
            } catch (error) {
              console.error('❌ Mock payment error:', error);
              ToastManager.error('Payment processing failed');
            }
          },
        },
        {
          text: 'Simulate Failure',
          onPress: () => {
            ToastManager.error('Payment failed - please try again');
          },
        },
      ]
    );
  };

  const renderOrderSummary = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Order Summary</Text>
      
      {cart?.items?.map((item, index) => (
        <View key={index} style={styles.orderItem}>
          <View style={styles.orderItemInfo}>
            <Text style={styles.orderItemName}>{item.name}</Text>
            <Text style={styles.orderItemDetails}>
              Qty: {item.quantity} × ${item.price?.toFixed(2) || '0.00'}
            </Text>
          </View>
          <Text style={styles.orderItemTotal}>
            ${(item.price * item.quantity).toFixed(2)}
          </Text>
        </View>
      ))}

      <View style={styles.totalContainer}>
        <Text style={styles.totalLabel}>Total:</Text>
        <Text style={styles.totalAmount}>${totalPrice.toFixed(2)}</Text>
      </View>
    </View>
  );

  if (step === 'success') {
    return (
      <View style={[styles.container, styles.centerContainer]}>
        <Text style={styles.successTitle}>🎉 Order Successful!</Text>
        <Text style={styles.successMessage}>
          Your order has been confirmed and will be prepared shortly.
        </Text>
        <Text style={styles.successSubtext}>
          Redirecting to menu in a moment...
        </Text>
        <ActivityIndicator size="large" color={config?.theme?.primaryColor || '#16a34a'} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Checkout</Text>

      {renderOrderSummary()}

      {step === 'order' && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Details</Text>
            
            <Text style={styles.label}>Email (Optional)</Text>
            <Text style={styles.input}>
              {customerEmail || 'No email provided'}
            </Text>
            
            <Text style={styles.label}>Special Instructions (Optional)</Text>
            <Text style={styles.input}>
              {notes || 'No special instructions'}
            </Text>
          </View>

          <Button
            title={isCreatingOrder ? 'Creating Order...' : 'Create Order & Setup Payment'}
            onPress={handleCreateOrder}
            disabled={isCreatingOrder || !cart?.items || cart.items.length === 0}
            style={[styles.button, { backgroundColor: config?.theme?.primaryColor || '#16a34a' }]}
          />
        </>
      )}

      {step === 'payment' && paymentIntent && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Ready</Text>
            
            <Text style={styles.paymentInfo}>
              Order created successfully! 
            </Text>
            <Text style={styles.paymentInfo}>
              Order ID: {currentOrder?.id.slice(-8)}
            </Text>
            <Text style={styles.paymentInfo}>
              Amount: ${(paymentIntent.amount / 100).toFixed(2)}
            </Text>
            
            <Text style={styles.testInfo}>
              This is a test environment. In production, you would see Stripe payment fields here.
            </Text>
          </View>

          <Button
            title={isProcessingPayment ? 'Processing...' : 'Test Payment (Simulate)'}
            onPress={handleMockPayment}
            disabled={isProcessingPayment}
            style={[styles.button, { backgroundColor: config?.theme?.primaryColor || '#16a34a' }]}
          />
        </>
      )}

      <Button
        title="Back to Cart"
        onPress={() => navigation.goBack()}
        variant="outline"
        style={styles.backButton}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 24,
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  orderItemInfo: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  orderItemDetails: {
    fontSize: 14,
    color: '#6b7280',
  },
  orderItemTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#16a34a',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#f9fafb',
    marginBottom: 16,
  },
  paymentInfo: {
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 8,
  },
  testInfo: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  button: {
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
  },
  backButton: {
    marginTop: 12,
    marginBottom: 32,
  },
  successTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#16a34a',
    marginBottom: 16,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 18,
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  successSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
});

export default SimpleCheckoutScreen;