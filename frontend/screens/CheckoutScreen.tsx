import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { StripeProvider, CardField, useStripe, initPaymentSheet, presentPaymentSheet } from '@stripe/stripe-react-native';
import { useCartStore } from '../stores/cartStore';
import { useOrderStore } from '../stores/orderStore';
import { useAuthStore } from '../stores/authStore';
import { useConfigStore } from '../stores/configStore';
import { useCatalogStore } from '../stores/catalogStore';
import { ToastManager } from '../utils/ToastManager';
import { Button } from '../components/ui/Button';
import { IngredientsList } from '../components/IngredientsList';
import { 
  getPlateBaseIngredients, 
  getIngredientsDetails,
  formatPrice 
} from '../utils/catalogHelpers';
import type { IngredientDetail } from '../types/domain';

interface CheckoutScreenProps {
  navigation: any;
}

const CheckoutForm: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { confirmPayment } = useStripe();
  const { cart, clearCart, validateCartStock } = useCartStore();
  const { 
    currentOrder, 
    paymentIntent, 
    isCreatingOrder, 
    isProcessingPayment,
    createPaymentIntent, 
    completePayment,
    clearCurrentOrder,
    clearPaymentIntent 
  } = useOrderStore();
  const { user } = useAuthStore();
  const { config } = useConfigStore();
  const { catalog, fetchCatalog } = useCatalogStore();

  const [isCardComplete, setIsCardComplete] = useState(false);
  const [cardDetails, setCardDetails] = useState<any>(null);
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [notes, setNotes] = useState('');
  const [itemsWithIngredients, setItemsWithIngredients] = useState<Array<{
    item: any;
    baseIngredients: IngredientDetail[];
    customIngredients: IngredientDetail[];
  }>>([]);

  // Calculate total from cart
  const totalPrice = cart?.items?.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0;

  useEffect(() => {
    // Set user email if available
    if (user?.email) {
      setCustomerEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    // Load ingredients details when cart or catalog changes
    if (cart?.items && catalog) {
      loadCartIngredients();
    }
  }, [cart, catalog]);

  const loadCartIngredients = async () => {
    if (!catalog || !cart?.items) return;

    const itemsDetails = await Promise.all(
      cart.items.map(async (item) => {
        let baseIngredients: IngredientDetail[] = [];
        let customIngredients: IngredientDetail[] = [];

        if (item.type === 'plate' && item.plateId) {
          // Get base ingredients from the plate
          baseIngredients = await getPlateBaseIngredients(item.plateId);
        }

        if (item.customIngredients && item.customIngredients.length > 0) {
          // Get custom ingredients details
          customIngredients = getIngredientsDetails(catalog, item.customIngredients, true);
        }

        return {
          item,
          baseIngredients,
          customIngredients
        };
      })
    );

    setItemsWithIngredients(itemsDetails);
  };

  const handleCreatePaymentIntent = async () => {
    if (!user) {
      ToastManager.error('Please log in to place an order');
      return;
    }

    if (!cart?.items || cart.items.length === 0) {
      ToastManager.error('Cart is empty');
      return;
    }

    // First validate stock before creating payment intent
    console.log('🔍 Validating cart stock...');
    const stockValid = await validateCartStock();
    
    if (!stockValid) {
      ToastManager.error('Some items in your cart are no longer available');
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

    // Create payment intent (no order created yet)
    const intent = await createPaymentIntent(
      orderItems,
      user.id,
      customerEmail || user.email,
      notes || undefined
    );

    if (!intent) {
      ToastManager.error('Failed to setup payment');
    }
  };

  const handlePayment = async () => {
    if (!paymentIntent || !confirmPayment || !user || !cart) {
      ToastManager.error('Payment not ready');
      return;
    }

    if (!isCardComplete) {
      ToastManager.error('Please complete your card information');
      return;
    }

    try {
      // Confirm payment with Stripe using CardField
      const { error, paymentIntent: confirmedIntent } = await confirmPayment(
        paymentIntent.clientSecret,
        {
          paymentMethodType: 'Card',
        }
      );

      if (error) {
        // Only log to console if it's a system error, not user errors
        if (error.type !== 'card_error') {
          console.error('❌ Stripe payment error:', error);
        }
        
        // Show user-friendly message
        const userMessage = error.localizedMessage || error.message || 'Payment failed';
        ToastManager.error(userMessage);
        
        // Clear the payment intent so user can try again with a new one
        clearPaymentIntent();
        return;
      }

      if (confirmedIntent?.status === 'Succeeded') {
        // Payment succeeded - now create the order
        console.log('✅ Payment succeeded, completing payment and creating order...');
        
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

        // Complete payment and create order in one operation
        const order = await completePayment(
          confirmedIntent.id,
          orderItems,
          user.id,
          customerEmail || user.email,
          notes || undefined
        );

        if (order) {
          // Success - order created and stock updated
          clearCart();
          clearCurrentOrder();
          clearPaymentIntent();
          
          // IMPORTANT: Refresh catalog to show updated stock
          console.log('🔄 Refreshing catalog to update stock...');
          await fetchCatalog();
          
          ToastManager.success('Payment Successful! Order confirmed.');
          
          setTimeout(() => {
            navigation.navigate('Main', { screen: 'MenuTab' });
          }, 2000);
        } else {
          ToastManager.error('Order creation failed after payment');
          // Clear payment intent so user can try again
          clearPaymentIntent();
        }
      } else {
        ToastManager.error(`Payment status: ${confirmedIntent?.status || 'Unknown'}`);
      }
    } catch (error) {
      console.error('❌ Payment processing error:', error);
      ToastManager.error('Payment processing failed');
      // Clear payment intent so user can try again
      clearPaymentIntent();
    }
  };

  const renderOrderSummary = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Order Summary</Text>
      
      {itemsWithIngredients.map((itemDetail, index) => {
        const { item, baseIngredients, customIngredients } = itemDetail;
        const hasCustomIngredients = customIngredients.length > 0;
        const customSubtotal = customIngredients.reduce((total, ing) => total + (ing.price * ing.quantity), 0);
        
        return (
          <View key={`checkout-item-${index}-${item.id}`} style={styles.orderItem}>
            {/* Item Header */}
            <View style={styles.orderItemHeader}>
              <View style={styles.orderItemInfo}>
                <Text style={styles.orderItemName}>{item.name}</Text>
                <Text style={styles.orderItemType}>
                  {item.type === 'plate' ? '🍽️ Menu Plate' : '🥗 Custom Creation'}
                </Text>
                <Text style={styles.orderItemDetails}>
                  Qty: {item.quantity} × {formatPrice(item.price)}
                </Text>
              </View>
              <Text style={styles.orderItemTotal}>
                {formatPrice(item.price * item.quantity)}
              </Text>
            </View>

            {/* Base Ingredients (for plates) */}
            {baseIngredients.length > 0 && (
              <View style={styles.ingredientsSection}>
                <IngredientsList
                  title="Included Ingredients"
                  ingredients={baseIngredients}
                  showPrices={false}
                />
              </View>
            )}

            {/* Custom Ingredients (with prices) */}
            {hasCustomIngredients && (
              <View style={styles.ingredientsSection}>
                <IngredientsList
                  title="Extra Ingredients"
                  ingredients={customIngredients}
                  showPrices={true}
                  showSubtotal={false}
                />
              </View>
            )}

            {/* Price Breakdown for Plates with Extras */}
            {item.type === 'plate' && hasCustomIngredients && (
              <View style={styles.priceBreakdownSmall}>
                <Text style={styles.breakdownText}>
                  Base: {formatPrice(item.price - customSubtotal)} + Extras: {formatPrice(customSubtotal)}
                </Text>
              </View>
            )}
          </View>
        );
      })}

      <View style={styles.totalContainer}>
        <Text style={styles.totalLabel}>Total:</Text>
        <Text style={styles.totalAmount}>{formatPrice(totalPrice)}</Text>
      </View>
    </View>
  );

  const renderPaymentSection = () => (
    <View style={styles.paymentSection}>
      <Text style={styles.sectionTitle}>Payment Information</Text>
      
      <View style={styles.cardContainer}>
        <Text style={styles.cardLabel}>Card Details</Text>
        <CardField
          postalCodeEnabled={true}
          placeholder={{
            number: '4242 4242 4242 4242',
            expiry: 'MM/YY',
            cvc: 'CVC',
            postalCode: '12345',
          }}
          cardStyle={{
            backgroundColor: '#FFFFFF',
            textColor: '#000000',
            fontSize: 16,
            placeholderColor: '#9ca3af',
            borderWidth: 1,
            borderColor: '#d1d5db',
            borderRadius: 8,
          }}
          style={styles.cardFieldExpanded}
          onCardChange={(details) => {
            setCardDetails(details);
            // Card is complete only if all fields are filled including postal code
            const isComplete = details.complete && details.postalCode && details.postalCode.length >= 5;
            setIsCardComplete(isComplete);
          }}
        />
        
        {!isCardComplete && (
          <Text style={styles.cardHint}>
            💳 Enter your card number, expiry date, CVC, and ZIP code (required)
          </Text>
        )}
        
        {cardDetails?.complete && !cardDetails?.postalCode && (
          <Text style={styles.cardWarning}>
            ⚠️ ZIP code is required for payment verification
          </Text>
        )}
        
        {cardDetails?.complete && cardDetails?.postalCode && cardDetails.postalCode.length < 5 && (
          <Text style={styles.cardWarning}>
            ⚠️ Please enter a valid ZIP code (at least 5 digits)
          </Text>
        )}
        
        {isCardComplete && (
          <Text style={styles.cardComplete}>
            ✅ Card details complete including ZIP code
          </Text>
        )}

        <Text style={styles.testCardInfo}>
          🧪 Test card: 4242 4242 4242 4242 (any future date, any CVC)
        </Text>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Checkout</Text>

      {!paymentIntent ? (
        <>
          {renderOrderSummary()}
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Details</Text>
            
            {/* Email field would go here if needed */}
            
            <Text style={styles.label}>Special Instructions (Optional)</Text>
            <Text style={styles.input}>
              {notes || 'No special instructions'}
            </Text>
          </View>

          <Button
            title={isCreatingOrder ? 'Setting up payment...' : 'Setup Payment'}
            onPress={handleCreatePaymentIntent}
            disabled={isCreatingOrder || !cart?.items || cart.items.length === 0}
            style={[styles.button, { backgroundColor: config?.theme?.primaryColor || '#16a34a' }]}
          />
        </>
      ) : (
        <>
          {renderOrderSummary()}
          
          {renderPaymentSection()}

          <Button
            title={isProcessingPayment ? 'Processing...' : 'Pay Now'}
            onPress={handlePayment}
            disabled={!paymentIntent || isProcessingPayment || !isCardComplete}
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

const CheckoutScreen: React.FC<CheckoutScreenProps> = ({ navigation }) => {
  const { paymentIntent } = useOrderStore();
  
  // Use the publishable key from the payment intent (most secure)
  // or fall back to environment variable
  const publishableKey = paymentIntent?.publishableKey || process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_51SUMK1Jhn8qVO6fD9UlijOSKTKv1j5ssyMHcrEgqxO9816XvCZ3KLVlkfBAxV9rHTbZXcMFNB8fxydjAHXvCsRIt00HxX9iarq';

  return (
    <StripeProvider publishableKey={publishableKey}>
      <CheckoutForm navigation={navigation} />
    </StripeProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
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
    marginBottom: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  orderItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  orderItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  orderItemType: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  orderItemDetails: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  orderItemTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  ingredientsSection: {
    backgroundColor: 'white',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  priceBreakdownSmall: {
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    padding: 8,
    marginTop: 4,
  },
  breakdownText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
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
  },
  // Payment Section Styles
  paymentSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContainer: {
    marginTop: 12,
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  cardFieldExpanded: {
    height: 80, // Increased height for better visibility
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 4,
  },
  cardField: {
    backgroundColor: '#f9fafb',
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 16,
    placeholderColor: '#9ca3af',
  },
  cardHint: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    textAlign: 'center',
    lineHeight: 20,
  },
  cardComplete: {
    fontSize: 14,
    color: '#16a34a',
    fontWeight: '600',
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 6,
    textAlign: 'center',
  },
  cardWarning: {
    fontSize: 14,
    color: '#f59e0b',
    fontWeight: '600',
    marginTop: 8,
    padding: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 6,
    textAlign: 'center',
  },
  testCardInfo: {
    fontSize: 12,
    color: '#8b5a2b',
    marginTop: 12,
    padding: 10,
    backgroundColor: '#fef3c7',
    borderRadius: 6,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 16,
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
});

export default CheckoutScreen;