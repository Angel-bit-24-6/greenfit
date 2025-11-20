import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useCartStore } from '../stores/cartStore';
// @ts-ignore - Using NUTRIFRESCO order store
import { useOrderStore } from '../stores/orderStore_nutrifresco';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import { useAuthStore } from '../stores/authStore';
import { useAddressStore, DeliveryAddress } from '../stores/addressStore';
import { useThemeStore } from '../stores/themeStore';
import { ToastManager } from '../utils/ToastManager';
import { AlertManager } from '../utils/AlertManager';
import { Button } from '../components/ui/Button';

export const CheckoutScreen: React.FC = () => {
  const navigation = useNavigation();
  const { cart, getTotalWeightInKg, getTotalItems } = useCartStore();
  const { createOrder, currentOrder, loading: orderLoading, setError } = useOrderStore();
  const { subscription, getRemainingKg } = useSubscriptionStore();
  const { user } = useAuthStore();
  const { 
    addresses, 
    selectedAddress, 
    addAddress, 
    selectAddress, 
    loadAddresses,
    getFavoriteAddresses,
    setFavorite,
    loading: addressesLoading 
  } = useAddressStore();
  const { getThemeColors, currentTheme, colorMode } = useThemeStore();
  const COLORS = getThemeColors();

  const [step, setStep] = useState<'address' | 'review' | 'success'>('address');
  const [saveAsFavorite, setSaveAsFavorite] = useState(false);
  const [useFavoriteAddress, setUseFavoriteAddress] = useState(false);
  const [selectedFavoriteId, setSelectedFavoriteId] = useState<string | null>(null);

  // Form fields
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [contactPhone, setContactPhone] = useState(user?.phone || '');
  const [references, setReferences] = useState('');

  const styles = useMemo(() => createStyles(COLORS, colorMode), [currentTheme.id, colorMode]);

  useEffect(() => {
    loadAddresses();
    if (user?.phone) {
      setContactPhone(user.phone);
    }
  }, []);

  useEffect(() => {
    if (selectedFavoriteId) {
      const favorite = addresses.find(addr => addr.id === selectedFavoriteId);
      if (favorite) {
        setStreet(favorite.street);
        setNumber(favorite.number);
        setNeighborhood(favorite.neighborhood);
        setPostalCode(favorite.postalCode);
        setCity(favorite.city);
        setState(favorite.state);
        setContactPhone(favorite.contactPhone);
        setReferences(favorite.references || '');
        selectAddress(selectedFavoriteId);
      }
    }
  }, [selectedFavoriteId]);

  const validateAddress = (): boolean => {
    if (!street.trim()) {
      ToastManager.error('Error', 'La calle es requerida');
      return false;
    }
    if (!number.trim()) {
      ToastManager.error('Error', 'El número es requerido');
      return false;
    }
    if (!neighborhood.trim()) {
      ToastManager.error('Error', 'La colonia es requerida');
      return false;
    }
    if (!postalCode.trim()) {
      ToastManager.error('Error', 'El código postal es requerido');
      return false;
    }
    if (!city.trim()) {
      ToastManager.error('Error', 'La ciudad es requerida');
      return false;
    }
    if (!state.trim()) {
      ToastManager.error('Error', 'El estado es requerido');
      return false;
    }
    if (!contactPhone.trim()) {
      ToastManager.error('Error', 'El teléfono de contacto es requerido');
      return false;
    }
    return true;
  };

  const handleSaveAddress = async () => {
    if (!validateAddress()) return;

    const addressData: Omit<DeliveryAddress, 'id' | 'createdAt'> = {
      street: street.trim(),
      number: number.trim(),
      neighborhood: neighborhood.trim(),
      postalCode: postalCode.trim(),
      city: city.trim(),
      state: state.trim(),
      contactPhone: contactPhone.trim(),
      references: references.trim() || undefined,
      isFavorite: saveAsFavorite,
    };

    const success = await addAddress(addressData);
    if (success) {
      if (saveAsFavorite) {
        ToastManager.success('Dirección guardada', 'La dirección se guardó en favoritos');
      }
      setStep('review');
    } else {
      ToastManager.error('Error', 'No se pudo guardar la dirección');
    }
  };

  const handleContinueToReview = () => {
    if (!validateAddress()) return;
    setStep('review');
  };

  const formatAddress = (): string => {
    return `${street} ${number}, ${neighborhood}, ${postalCode}, ${city}, ${state}`;
  };

  const handleConfirmOrder = async () => {
    if (!cart || cart.items.length === 0) {
      ToastManager.error('Error', 'El carrito está vacío');
      return;
    }

    if (!subscription || !subscription.isActive) {
      AlertManager.alert(
        'Suscripción Requerida',
        'Necesitas un plan de suscripción activo para realizar pedidos.'
      );
      return;
    }

    const totalWeight = getTotalWeightInKg();
    const remainingKg = getRemainingKg();

    if (totalWeight > remainingKg) {
      AlertManager.alert(
        'Límite Excedido',
        `El peso total de tu carrito (${totalWeight.toFixed(2)} kg) excede tu límite disponible (${remainingKg.toFixed(2)} kg).`
      );
      return;
    }

    const deliveryAddress = formatAddress();
    const notes = references.trim() || undefined;

    // Save address as favorite if requested
    if (saveAsFavorite && !selectedFavoriteId) {
      const addressData: Omit<DeliveryAddress, 'id' | 'createdAt'> = {
        street: street.trim(),
        number: number.trim(),
        neighborhood: neighborhood.trim(),
        postalCode: postalCode.trim(),
        city: city.trim(),
        state: state.trim(),
        contactPhone: contactPhone.trim(),
        references: references.trim() || undefined,
        isFavorite: true,
      };
      await addAddress(addressData);
    }

    // Simulate payment (no real payment in NUTRIFRESCO)
    AlertManager.confirm(
      'Confirmar Pedido',
      `¿Deseas confirmar tu pedido de ${totalWeight.toFixed(2)} kg?`,
      async () => {
        const success = await createOrder({
          deliveryAddress,
          notes,
        });

        if (success) {
          setStep('success');
          ToastManager.success('Pedido Confirmado', 'Tu pedido ha sido creado exitosamente');
          
          // Wait a bit for the store to update, then navigate
          setTimeout(() => {
            const orderId = currentOrder?.id;
            if (orderId) {
              (navigation as any).navigate('OrderTracking', { orderId });
            } else {
              // Fallback: try to get from store state
              const storeOrder = useOrderStore.getState().currentOrder;
              if (storeOrder?.id) {
                (navigation as any).navigate('OrderTracking', { orderId: storeOrder.id });
              } else {
                (navigation as any).navigate('Main', { screen: 'HomeTab' });
              }
            }
          }, 2000);
        } else {
          ToastManager.error('Error', 'No se pudo crear el pedido');
        }
      }
    );
  };

  const totalWeight = getTotalWeightInKg();
  const totalItems = getTotalItems();
  const remainingKg = getRemainingKg();
  const favoriteAddresses = getFavoriteAddresses();

  if (step === 'success') {
    return (
      <View style={[styles.container, styles.centerContainer, { backgroundColor: COLORS.background }]}>
        <Text style={[styles.successIcon, { color: COLORS.primary }]}>✅</Text>
        <Text style={[styles.successTitle, { color: COLORS.text }]}>¡Pedido Confirmado!</Text>
        <Text style={[styles.successMessage, { color: COLORS.textSecondary }]}>
          Tu pedido ha sido creado exitosamente y será procesado pronto.
        </Text>
        <Text style={[styles.successSubtext, { color: COLORS.textSecondary }]}>
          Redirigiendo al inicio...
        </Text>
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 24 }} />
      </View>
    );
  }

  if (step === 'review') {
    return (
      <ScrollView style={[styles.container, { backgroundColor: COLORS.background }]} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: COLORS.text }]}>Revisar Pedido</Text>

        {/* Order Summary */}
        <View style={[styles.section, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Resumen del Pedido</Text>
          
          {cart?.items.map((item, index) => (
            <View key={index} style={styles.orderItem}>
              <View style={styles.orderItemInfo}>
                <Text style={[styles.orderItemName, { color: COLORS.text }]}>{item.name}</Text>
                {item.product?.producer && (
                  <Text style={[styles.producerName, { color: COLORS.textSecondary }]}>
                    🧑‍🌾 {item.product.producer.businessName}
                  </Text>
                )}
                <Text style={[styles.orderItemDetails, { color: COLORS.textSecondary }]}>
                  Cantidad: {item.quantity} × {item.weightInKg / item.quantity} kg
                </Text>
              </View>
              <Text style={[styles.orderItemWeight, { color: COLORS.primary }]}>
                {item.weightInKg.toFixed(2)} kg
              </Text>
            </View>
          ))}

          <View style={[styles.totalContainer, { borderTopColor: COLORS.border }]}>
            <Text style={[styles.totalLabel, { color: COLORS.text }]}>Peso Total:</Text>
            <Text style={[styles.totalWeight, { color: COLORS.primary }]}>
              {totalWeight.toFixed(2)} kg
            </Text>
          </View>

          {subscription && (
            <View style={styles.subscriptionInfo}>
              <Text style={[styles.subscriptionText, { color: COLORS.textSecondary }]}>
                Plan {subscription.plan} • {remainingKg.toFixed(2)} kg restantes
              </Text>
            </View>
          )}
        </View>

        {/* Delivery Address */}
        <View style={[styles.section, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>📍 Dirección de Entrega</Text>
          <Text style={[styles.addressText, { color: COLORS.text }]}>{formatAddress()}</Text>
          {references && (
            <View style={styles.referencesContainer}>
              <Text style={[styles.referencesLabel, { color: COLORS.textSecondary }]}>Referencias:</Text>
              <Text style={[styles.referencesText, { color: COLORS.text }]}>{references}</Text>
            </View>
          )}
          <Text style={[styles.phoneText, { color: COLORS.textSecondary }]}>
            📞 {contactPhone}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            title="Editar Dirección"
            onPress={() => setStep('address')}
            variant="outline"
            style={styles.editButton}
          />
          <Button
            title={orderLoading ? 'Confirmando...' : 'Confirmar Pedido'}
            onPress={handleConfirmOrder}
            disabled={orderLoading}
            style={styles.confirmButton}
          />
        </View>

        <Button
          title="Volver al Carrito"
          onPress={() => navigation.goBack()}
          variant="outline"
          style={styles.backButton}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: COLORS.background }]} showsVerticalScrollIndicator={false}>
      <View style={[styles.header, { borderBottomColor: COLORS.border }]}>
        <Text style={[styles.title, { color: COLORS.text }]}>Datos de envío</Text>
        <Text style={[styles.subtitle, { color: COLORS.textSecondary }]}>
          Completa los datos para la entrega de tus productos frescos
        </Text>
      </View>

      {/* Favorite Addresses */}
      {favoriteAddresses.length > 0 && (
        <View style={[styles.favoritesSection, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
          <Text style={[styles.favoritesTitle, { color: COLORS.text }]}>⭐ Direcciones Favoritas</Text>
          {favoriteAddresses.map((addr) => (
            <TouchableOpacity
              key={addr.id}
              style={[
                styles.favoriteCard,
                {
                  backgroundColor: selectedFavoriteId === addr.id ? COLORS.primary + '20' : COLORS.background,
                  borderColor: selectedFavoriteId === addr.id ? COLORS.primary : COLORS.border,
                },
              ]}
              onPress={() => {
                setSelectedFavoriteId(addr.id);
                setUseFavoriteAddress(true);
              }}
            >
              <Text style={[styles.favoriteAddressText, { color: COLORS.text }]}>
                {addr.street} {addr.number}, {addr.neighborhood}
              </Text>
              <Text style={[styles.favoriteCityText, { color: COLORS.textSecondary }]}>
                {addr.city}, {addr.state} • {addr.postalCode}
              </Text>
            </TouchableOpacity>
          ))}
          {selectedFavoriteId && (
            <Button
              title="Usar esta dirección"
              onPress={handleContinueToReview}
              style={styles.useFavoriteButton}
            />
          )}
        </View>
      )}

      {/* Address Form */}
      <View style={[styles.section, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
        <Text style={[styles.sectionTitle, { color: COLORS.text }]}>
          {useFavoriteAddress ? 'O ingresa una nueva dirección' : 'Dirección de Entrega'}
        </Text>

        <View style={styles.formRow}>
          <View style={[styles.formGroup, { flex: 2 }]}>
            <Text style={[styles.label, { color: COLORS.text }]}>Calle *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: COLORS.background, borderColor: COLORS.border, color: COLORS.text }]}
              value={street}
              onChangeText={setStreet}
              placeholder="Av. Insurgentes Sur"
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>
          <View style={[styles.formGroup, { flex: 1, marginLeft: 12 }]}>
            <Text style={[styles.label, { color: COLORS.text }]}>Número *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: COLORS.background, borderColor: COLORS.border, color: COLORS.text }]}
              value={number}
              onChangeText={setNumber}
              placeholder="123"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.formRow}>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: COLORS.text }]}>Colonia *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: COLORS.background, borderColor: COLORS.border, color: COLORS.text }]}
              value={neighborhood}
              onChangeText={setNeighborhood}
              placeholder="Del Valle"
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>
          <View style={[styles.formGroup, { flex: 1, marginLeft: 12 }]}>
            <Text style={[styles.label, { color: COLORS.text }]}>Código Postal *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: COLORS.background, borderColor: COLORS.border, color: COLORS.text }]}
              value={postalCode}
              onChangeText={setPostalCode}
              placeholder="03100"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.formRow}>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: COLORS.text }]}>Ciudad *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: COLORS.background, borderColor: COLORS.border, color: COLORS.text }]}
              value={city}
              onChangeText={setCity}
              placeholder="Ciudad de México"
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>
          <View style={[styles.formGroup, { flex: 1, marginLeft: 12 }]}>
            <Text style={[styles.label, { color: COLORS.text }]}>Estado *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: COLORS.background, borderColor: COLORS.border, color: COLORS.text }]}
              value={state}
              onChangeText={setState}
              placeholder="CDMX"
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: COLORS.text }]}>Teléfono de contacto *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: COLORS.background, borderColor: COLORS.border, color: COLORS.text }]}
            value={contactPhone}
            onChangeText={setContactPhone}
            placeholder="5512345678"
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: COLORS.text }]}>Referencias (opcional)</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: COLORS.background, borderColor: COLORS.border, color: COLORS.text }]}
            value={references}
            onChangeText={setReferences}
            placeholder="Casa azul, portón negro, entre calle X y Y"
            placeholderTextColor={COLORS.textSecondary}
            multiline
            numberOfLines={3}
          />
        </View>

        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => setSaveAsFavorite(!saveAsFavorite)}
        >
          <View style={[
            styles.checkbox,
            {
              backgroundColor: saveAsFavorite ? COLORS.primary : 'transparent',
              borderColor: saveAsFavorite ? COLORS.primary : COLORS.border,
            },
          ]}>
            {saveAsFavorite && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={[styles.checkboxLabel, { color: COLORS.text }]}>
            Guardar como dirección favorita
          </Text>
        </TouchableOpacity>
      </View>

      {/* Action Button */}
      <Button
        title="Confirmar dirección y continuar"
        onPress={handleContinueToReview}
        style={styles.continueButton}
        size="large"
      />

      <Button
        title="Volver al Carrito"
        onPress={() => navigation.goBack()}
        variant="outline"
        style={styles.backButton}
      />
    </ScrollView>
  );
};

const createStyles = (COLORS: any, colorMode: 'dark' | 'light') => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  header: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  favoritesSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  favoritesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  favoriteCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    backgroundColor: COLORS.background,
  },
  favoriteAddressText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  favoriteCityText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  useFavoriteButton: {
    marginTop: 8,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: COLORS.text,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 44,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
    flex: 1,
  },
  continueButton: {
    marginTop: 24,
    marginBottom: 12,
  },
  backButton: {
    marginBottom: 32,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  orderItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  orderItemName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  producerName: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  orderItemDetails: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  orderItemWeight: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: COLORS.border,
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  totalWeight: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary,
  },
  subscriptionInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  subscriptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  addressText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 24,
  },
  referencesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  referencesLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  referencesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  phoneText: {
    fontSize: 14,
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  editButton: {
    flex: 0.4,
  },
  confirmButton: {
    flex: 0.6,
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  successSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});
