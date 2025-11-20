import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Image,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Button } from '../../components/ui/Button';
import { useThemeStore } from '../../stores/themeStore';
import { useAuthStore } from '../../stores/authStore';
import { ToastManager } from '../../utils/ToastManager';
import { AlertManager } from '../../utils/AlertManager';
import AuthService from '../../services/authService';
import type { SubscriptionPlan } from '../../stores/subscriptionStore';
import type { RootStackParamList } from '../../navigation/AppNavigator';

type PaymentMethod = 'card' | 'paypal';

type SubscriptionPaymentRouteParams = {
  SubscriptionPayment: {
    subscriptionPlan: SubscriptionPlan;
    userData: {
      name: string;
      email: string;
      phone: string;
      password: string;
    };
  };
};

type SubscriptionPaymentRouteProp = RouteProp<SubscriptionPaymentRouteParams, 'SubscriptionPayment'>;

const SUBSCRIPTION_PLANS = {
  BASIC: { name: 'Básico', limit: 5, price: 199, emoji: '🥬' },
  STANDARD: { name: 'Estándar', limit: 8, price: 399, emoji: '🌱' },
  PREMIUM: { name: 'Premium', limit: 10, price: 599, emoji: '🌟' },
};

export const SubscriptionPaymentScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<SubscriptionPaymentRouteProp>();
  const { subscriptionPlan, userData } = route.params;

  const { getThemeColors, currentTheme, colorMode } = useThemeStore();
  const { login, setLoading: setAuthLoading } = useAuthStore();
  const COLORS = getThemeColors();
  const styles = useMemo(() => createStyles(COLORS, colorMode), [currentTheme.id, colorMode]);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Card fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});

  // PayPal
  const [paypalEmail, setPaypalEmail] = useState('');
  const [paypalPassword, setPaypalPassword] = useState('');

  const plan = SUBSCRIPTION_PLANS[subscriptionPlan];
  const fadeAnim = useMemo(() => new Animated.Value(0), []);
  const processingOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (processing) {
      Animated.timing(processingOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(processingOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [processing]);

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\s/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted.slice(0, 19);
  };

  const formatExpiryDate = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  const validateCard = (): boolean => {
    const errors: Record<string, string> = {};

    const cleanedCardNumber = cardNumber.replace(/\s/g, '');
    if (!cleanedCardNumber || cleanedCardNumber.length < 16) {
      errors.cardNumber = 'Número de tarjeta inválido';
    } else if (cleanedCardNumber !== '4242424242424242' && cleanedCardNumber !== '5555555555554444') {
      errors.cardNumber = 'Usa una tarjeta de prueba (4242 4242 4242 4242)';
    }

    if (!cardName.trim() || cardName.trim().length < 3) {
      errors.cardName = 'Nombre en tarjeta requerido';
    }

    if (!expiryDate || expiryDate.length !== 5) {
      errors.expiryDate = 'Fecha de expiración inválida';
    } else {
      const [month, year] = expiryDate.split('/');
      const monthNum = parseInt(month, 10);
      const yearNum = parseInt('20' + year, 10);
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;

      if (monthNum < 1 || monthNum > 12) {
        errors.expiryDate = 'Mes inválido';
      } else if (yearNum < currentYear || (yearNum === currentYear && monthNum < currentMonth)) {
        errors.expiryDate = 'Tarjeta expirada';
      }
    }

    if (!cvv || cvv.length < 3) {
      errors.cvv = 'CVV inválido';
    }

    setCardErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePayPal = (): boolean => {
    if (!paypalEmail.trim() || !/\S+@\S+\.\S+/.test(paypalEmail)) {
      ToastManager.error('Error', 'Email de PayPal inválido');
      return false;
    }
    if (!paypalPassword.trim() || paypalPassword.length < 6) {
      ToastManager.error('Error', 'Contraseña de PayPal requerida');
      return false;
    }
    return true;
  };

  const simulatePayment = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      setProcessing(true);
      setTimeout(() => {
        setProcessing(false);
        resolve(true);
      }, 2000);
    });
  };

  const handlePayment = async () => {
    if (paymentMethod === 'card') {
      if (!validateCard()) return;
    } else {
      if (!validatePayPal()) return;
    }

    setLoading(true);

    try {
      const success = await simulatePayment();

      if (success) {
        ToastManager.success('Pago Exitoso', 'Tu suscripción ha sido activada');
        
        setAuthLoading(true);
        try {
          const response = await AuthService.register({
            name: userData.name,
            email: userData.email,
            phone: userData.phone,
            password: userData.password,
            subscriptionPlan,
          });

          if (response.ok && response.data) {
            const user = {
              ...response.data.user,
              phone: response.data.user.phone ?? undefined,
            };
            await login(user, response.data.token);
            ToastManager.success('¡Bienvenido!', 'Tu cuenta ha sido creada y activada');
            
            // Navigation will happen automatically via auth state change in AppNavigator
            // No need to manually navigate - the navigator will switch to Main stack
          } else {
            ToastManager.error('Error', response.message || 'Error al crear la cuenta');
          }
        } catch (error) {
          console.error('❌ Registration error:', error);
          ToastManager.error('Error', 'Ocurrió un error al crear tu cuenta');
        } finally {
          setAuthLoading(false);
        }
      } else {
        ToastManager.error('Error', 'El pago no pudo ser procesado');
      }
    } catch (error) {
      console.error('Payment error:', error);
      ToastManager.error('Error', 'Ocurrió un error al procesar el pago');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: COLORS.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: COLORS.text }]}>💳 Pago de Suscripción</Text>
            <Text style={[styles.subtitle, { color: COLORS.textSecondary }]}>
              Completa el pago para activar tu plan {plan.name}
            </Text>
          </View>

          {/* Plan Summary - Sin card, solo bloque plano */}
          <View style={styles.planSection}>
            <View style={styles.planHeader}>
              <Text style={styles.planEmoji}>{plan.emoji}</Text>
              <View>
                <Text style={[styles.planName, { color: COLORS.text }]}>{plan.name}</Text>
                <Text style={[styles.planLimit, { color: COLORS.textSecondary }]}>
                  {plan.limit} kg/mes
                </Text>
              </View>
            </View>
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: COLORS.textSecondary }]}>Total a pagar</Text>
              <Text style={[styles.price, { color: COLORS.primary }]}>
                ${plan.price.toFixed(2)} MXN
              </Text>
            </View>
          </View>

          {/* Payment Method Selection */}
          <View style={styles.paymentMethodSection}>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Método de pago</Text>
            <View style={styles.paymentMethods}>
              <TouchableOpacity
                style={[
                  styles.paymentMethod,
                  paymentMethod === 'card' && styles.paymentMethodActive,
                ]}
                onPress={() => setPaymentMethod('card')}
                activeOpacity={0.7}
              >
                <Text style={styles.paymentMethodIcon}>💳</Text>
                <Text style={[
                  styles.paymentMethodName,
                  { color: paymentMethod === 'card' ? COLORS.primary : COLORS.text }
                ]}>
                  Tarjeta
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.paymentMethod,
                  paymentMethod === 'paypal' && styles.paymentMethodActive,
                ]}
                onPress={() => setPaymentMethod('paypal')}
                activeOpacity={0.7}
              >
                <Image 
                  source={require('../../public/logopaypal.png')} 
                  style={styles.paypalLogo}
                  resizeMode="contain"
                />
                <Text style={[
                  styles.paymentMethodName,
                  { color: paymentMethod === 'paypal' ? COLORS.primary : COLORS.text }
                ]}>
                  PayPal
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Formularios - Sin cards */}
          {paymentMethod === 'card' && (
            <View style={styles.formSection}>
              <Text style={[styles.formTitle, { color: COLORS.text }]}>Datos de la tarjeta</Text>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: COLORS.text }]}>Número de tarjeta *</Text>
                <View style={[
                  styles.inputRow,
                  { borderBottomColor: cardErrors.cardNumber ? COLORS.error : COLORS.border }
                ]}>
                  <TextInput
                    style={[styles.input, { color: COLORS.text }]}
                    value={cardNumber}
                    onChangeText={(text) => setCardNumber(formatCardNumber(text))}
                    placeholder="4242 4242 4242 4242"
                    placeholderTextColor={COLORS.textSecondary}
                    keyboardType="numeric"
                    maxLength={19}
                  />
                </View>
                {cardErrors.cardNumber && (
                  <Text style={[styles.errorText, { color: COLORS.error }]}>
                    {cardErrors.cardNumber}
                  </Text>
                )}
                <Text style={[styles.hintText, { color: COLORS.textSecondary }]}>
                  💡 Usa: 4242 4242 4242 4242 (tarjeta de prueba)
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: COLORS.text }]}>Nombre en la tarjeta *</Text>
                <View style={[styles.inputRow, { borderBottomColor: COLORS.border }]}>
                  <TextInput
                    style={[styles.input, { color: COLORS.text }]}
                    value={cardName}
                    onChangeText={setCardName}
                    placeholder="Juan Pérez"
                    placeholderTextColor={COLORS.textSecondary}
                    autoCapitalize="words"
                  />
                </View>
                {cardErrors.cardName && (
                  <Text style={[styles.errorText, { color: COLORS.error }]}>
                    {cardErrors.cardName}
                  </Text>
                )}
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: COLORS.text }]}>Vencimiento *</Text>
                  <View style={[
                    styles.inputRow,
                    { borderBottomColor: cardErrors.expiryDate ? COLORS.error : COLORS.border }
                  ]}>
                    <TextInput
                      style={[styles.input, { color: COLORS.text }]}
                      value={expiryDate}
                      onChangeText={(text) => setExpiryDate(formatExpiryDate(text))}
                      placeholder="MM/AA"
                      placeholderTextColor={COLORS.textSecondary}
                      keyboardType="numeric"
                      maxLength={5}
                    />
                  </View>
                  {cardErrors.expiryDate && (
                    <Text style={[styles.errorText, { color: COLORS.error }]}>
                      {cardErrors.expiryDate}
                    </Text>
                  )}
                </View>

                <View style={[styles.formGroup, { flex: 1, marginLeft: 16 }]}>
                  <Text style={[styles.label, { color: COLORS.text }]}>CVV *</Text>
                  <View style={[
                    styles.inputRow,
                    { borderBottomColor: cardErrors.cvv ? COLORS.error : COLORS.border }
                  ]}>
                    <TextInput
                      style={[styles.input, { color: COLORS.text }]}
                      value={cvv}
                      onChangeText={(text) => setCvv(text.replace(/\D/g, '').slice(0, 4))}
                      placeholder="123"
                      placeholderTextColor={COLORS.textSecondary}
                      keyboardType="numeric"
                      secureTextEntry
                      maxLength={4}
                    />
                  </View>
                  {cardErrors.cvv && (
                    <Text style={[styles.errorText, { color: COLORS.error }]}>
                      {cardErrors.cvv}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          )}

          {paymentMethod === 'paypal' && (
            <View style={styles.formSection}>
              <Text style={[styles.formTitle, { color: COLORS.text }]}>Iniciar sesión en PayPal</Text>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: COLORS.text }]}>Email de PayPal *</Text>
                <View style={[styles.inputRow, { borderBottomColor: COLORS.border }]}>
                  <TextInput
                    style={[styles.input, { color: COLORS.text }]}
                    value={paypalEmail}
                    onChangeText={setPaypalEmail}
                    placeholder="tu@email.com"
                    placeholderTextColor={COLORS.textSecondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: COLORS.text }]}>Contraseña *</Text>
                <View style={[styles.inputRow, { borderBottomColor: COLORS.border }]}>
                  <TextInput
                    style={[styles.input, { color: COLORS.text }]}
                    value={paypalPassword}
                    onChangeText={setPaypalPassword}
                    placeholder="••••••••"
                    placeholderTextColor={COLORS.textSecondary}
                    secureTextEntry
                  />
                </View>
                <Text style={[styles.hintText, { color: COLORS.textSecondary }]}>
                  💡 Simulación: cualquier email y contraseña funcionarán
                </Text>
              </View>
            </View>
          )}

          {/* Payment Button */}
          <Button
            title={loading ? 'Procesando...' : `Pagar $${plan.price.toFixed(2)} MXN`}
            onPress={handlePayment}
            disabled={loading || processing}
            size="large"
            style={styles.payButton}
          />

          {/* Security Notice */}
          <View style={styles.securityNotice}>
            <Text style={styles.securityIcon}>🔒</Text>
            <Text style={[styles.securityText, { color: COLORS.textSecondary }]}>
              Tus datos están protegidos con encriptación SSL. Este es un entorno de prueba.
            </Text>
          </View>

          <Button
            title="Volver"
            onPress={() => navigation.goBack()}
            variant="outline"
            style={styles.backButton}
          />
        </Animated.View>

        {/* Processing Overlay - Minimalista */}
        {processing && (
          <Animated.View 
            style={[
              styles.processingOverlay,
              { opacity: processingOpacity }
            ]}
          >
            <View style={styles.processingContent}>
              {paymentMethod === 'paypal' ? (
                <Image 
                  source={require('../../public/logopaypal.png')} 
                  style={styles.processingLogo}
                  resizeMode="contain"
                />
              ) : (
                <View style={[styles.processingIconContainer, { backgroundColor: COLORS.primary + '10' }]}>
                  <Text style={styles.processingIcon}>💳</Text>
                </View>
              )}
              <Text style={[styles.processingText, { color: COLORS.text }]}>Procesando pago...</Text>
              <ActivityIndicator size="large" color={COLORS.primary} style={styles.spinner} />
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = (COLORS: any, colorMode: 'dark' | 'light') => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    color: COLORS.textSecondary,
  },
  
  // --- SECCIÓN DE PLAN ---
  planSection: {
    paddingVertical: 20,
    marginBottom: 32,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  planEmoji: {
    fontSize: 40,
    marginRight: 16,
  },
  planName: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  planLimit: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 18,
    color: COLORS.textSecondary,
  },
  price: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primary,
  },

  // --- MÉTODO DE PAGO ---
  paymentMethodSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  paymentMethods: {
    flexDirection: 'row',
    gap: 16,
  },
  paymentMethod: {
    flex: 1,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
  },
  paymentMethodActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '08',
  },
  paymentMethodIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  paypalLogo: {
    width: 50,
    height: 50,
    marginBottom: 8,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600',
  },

  // --- FORMULARIO ---
  formSection: {
    marginBottom: 32,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 24,
    letterSpacing: -0.3,
  },
  formGroup: {
    marginBottom: 24,
  },
  formRow: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
    color: COLORS.text,
  },
  inputRow: {
    borderBottomWidth: 2,
    paddingBottom: 12,
  },
  input: {
    fontSize: 17,
    color: COLORS.text,
    padding: 0,
    height: 40,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 13,
    marginTop: 6,
    fontWeight: '600',
  },
  hintText: {
    fontSize: 13,
    marginTop: 6,
    fontStyle: 'italic',
    color: COLORS.textSecondary,
  },

  // --- BOTONES ---
  payButton: {
    marginBottom: 20,
  },
  backButton: {
    marginBottom: 32,
  },

  // --- AVISO DE SEGURIDAD ---
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 32,
    padding: 16,
    backgroundColor: COLORS.background, // Mismo fondo
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  securityIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  securityText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },

  // --- OVERLAY DE PROCESAMIENTO ---
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.background + 'CC', // Fondo semitransparente
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  processingContent: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    minWidth: 260,
  },
  processingLogo: {
    width: 70,
    height: 70,
    marginBottom: 24,
  },
  processingIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  processingIcon: {
    fontSize: 40,
  },
  processingText: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    color: COLORS.text,
  },
  spinner: {
    marginTop: 8,
  },
});