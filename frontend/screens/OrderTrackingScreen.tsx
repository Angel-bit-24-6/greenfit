import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useOrderStore } from '../stores/orderStore_nutrifresco';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import { ToastManager } from '../utils/ToastManager';
import { Button } from '../components/ui/Button';

type OrderTrackingRouteParams = {
  OrderTracking: {
    orderId: string;
  };
};

type OrderTrackingRouteProp = RouteProp<OrderTrackingRouteParams, 'OrderTracking'>;

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

interface DeliveryStep {
  id: OrderStatus;
  label: string;
  description: string;
  emoji: string;
}

const DELIVERY_STEPS: DeliveryStep[] = [
  {
    id: 'confirmed',
    label: 'Pedido confirmado',
    description: 'Tu pedido ha sido recibido y estamos preparándolo',
    emoji: '✅',
  },
  {
    id: 'preparing',
    label: 'En preparación',
    description: 'Estamos preparando tu pedido',
    emoji: '👨‍🍳',
  },
  {
    id: 'ready',
    label: 'En camino',
    description: 'Tu pedido está en ruta hacia tu domicilio',
    emoji: '🚚',
  },
  {
    id: 'delivered',
    label: 'Entregado',
    description: '¡Tu pedido ha sido entregado exitosamente!',
    emoji: '🎉',
  },
];

const getStatusIndex = (status: string): number => {
  const index = DELIVERY_STEPS.findIndex(step => step.id === status);
  return index >= 0 ? index : 0;
};

const getEstimatedTime = (status: string): string => {
  switch (status) {
    case 'confirmed':
      return '30-45 min';
    case 'preparing':
      return '20-30 min';
    case 'ready':
      return '10-20 min';
    case 'delivered':
      return '¡Entregado!';
    default:
      return 'Calculando...';
  }
};

export const OrderTrackingScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<OrderTrackingRouteProp>();
  const { orderId } = route.params;
  const { user } = useAuthStore();
  const { currentOrder, fetchOrderById, loading } = useOrderStore();
  const { getThemeColors, currentTheme, colorMode } = useThemeStore();
  const COLORS = getThemeColors();

  const [currentStatus, setCurrentStatus] = useState<OrderStatus>('confirmed');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const styles = useMemo(() => createStyles(COLORS, colorMode), [currentTheme.id, colorMode]);

  useEffect(() => {
    if (orderId) {
      fetchOrderById(orderId);
    }
  }, [orderId]);

  useEffect(() => {
    if (currentOrder) {
      setCurrentStatus(currentOrder.status as OrderStatus);
    }
  }, [currentOrder]);

  // Simulación automática de estados cada 2 segundos
  useEffect(() => {
    // Limpiar intervalo anterior si existe
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Solo simular si no está entregado
    if (currentStatus === 'delivered') return;

    const statusOrder: OrderStatus[] = ['confirmed', 'preparing', 'ready', 'delivered'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    
    // Si ya está en el último estado, no hacer nada
    if (currentIndex >= statusOrder.length - 1) return;

    // Usar setTimeout para evitar actualizar durante el renderizado
    intervalRef.current = setInterval(() => {
      setCurrentStatus((prevStatus) => {
        const prevIndex = statusOrder.indexOf(prevStatus);
        
        // Si ya está entregado, no avanzar más
        if (prevIndex >= statusOrder.length - 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return prevStatus;
        }

        const nextStatus = statusOrder[prevIndex + 1];
        
        // Usar setTimeout para mostrar notificaciones después del renderizado
        setTimeout(() => {
          if (nextStatus === 'delivered') {
            ToastManager.success('Pedido Entregado', '¡Tu pedido ha sido entregado exitosamente!');
          } else {
            const stepLabel = DELIVERY_STEPS.find(s => s.id === nextStatus)?.label || nextStatus;
            ToastManager.success('Estado Actualizado', `Tu pedido ahora está: ${stepLabel}`);
          }
        }, 0);

        return nextStatus;
      });
    }, 2000); // 2 segundos

    // Limpiar intervalo cuando el componente se desmonte o cambie el estado
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [currentStatus]);

  const currentStepIndex = getStatusIndex(currentStatus);
  const isDelivered = currentStatus === 'delivered';

  if (loading && !currentOrder) {
    return (
      <View style={[styles.container, styles.centerContainer, { backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={[styles.loadingText, { color: COLORS.textSecondary }]}>Cargando pedido...</Text>
      </View>
    );
  }

  if (!currentOrder) {
    return (
      <View style={[styles.container, styles.centerContainer, { backgroundColor: COLORS.background }]}>
        <Text style={[styles.errorText, { color: COLORS.error }]}>Pedido no encontrado</Text>
        <Button
          title="Volver"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        />
      </View>
    );
  }

  const orderNumber = currentOrder.id.slice(-8).toUpperCase();
  const estimatedTime = getEstimatedTime(currentStatus);

  return (
    <ScrollView style={[styles.container, { backgroundColor: COLORS.background }]} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: COLORS.border }]}>
        <Text style={[styles.greeting, { color: COLORS.text }]}>
          Hola {user?.name?.split(' ')[0] || 'Usuario'}, aquí está el estado de tu entrega
        </Text>
      </View>

      {/* Order Number */}
      <View style={[styles.orderNumberCard, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
        <Text style={[styles.orderNumberLabel, { color: COLORS.textSecondary }]}>Número de pedido</Text>
        <Text style={[styles.orderNumber, { color: COLORS.primary }]}>#{orderNumber}</Text>
      </View>

      {/* Estimated Time */}
      <View style={[styles.timeCard, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
        <Text style={[styles.timeLabel, { color: COLORS.textSecondary }]}>Tiempo estimado</Text>
        <Text style={[styles.timeValue, { color: isDelivered ? COLORS.primary : COLORS.text }]}>
          {estimatedTime}
        </Text>
      </View>

      {/* Status Display */}
      {isDelivered && (
        <View style={[styles.deliveredCard, { backgroundColor: COLORS.primary + '20', borderColor: COLORS.primary }]}>
          <Text style={styles.deliveredEmoji}>✅</Text>
          <Text style={[styles.deliveredTitle, { color: COLORS.primary }]}>¡Entregado!</Text>
          <Text style={[styles.deliveredMessage, { color: COLORS.text }]}>
            ¡Tu pedido ha sido entregado exitosamente!
          </Text>
        </View>
      )}

      {/* Progress Steps */}
      <View style={[styles.progressSection, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
        <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Progreso de entrega</Text>

        {DELIVERY_STEPS.map((step, index) => {
          const isCompleted = index <= currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isLast = index === DELIVERY_STEPS.length - 1;

          return (
            <View key={step.id} style={styles.stepContainer}>
              {/* Step Circle and Line */}
              <View style={styles.stepIndicator}>
                <View
                  style={[
                    styles.stepCircle,
                    {
                      backgroundColor: isCompleted ? COLORS.primary : COLORS.surfaceElevated,
                      borderColor: isCompleted ? COLORS.primary : COLORS.border,
                    },
                  ]}
                >
                  {isCompleted && <Text style={styles.stepEmoji}>{step.emoji}</Text>}
                </View>
                {!isLast && (
                  <View
                    style={[
                      styles.stepLine,
                      {
                        backgroundColor: isCompleted ? COLORS.primary : COLORS.border,
                      },
                    ]}
                  />
                )}
              </View>

              {/* Step Content */}
              <View style={styles.stepContent}>
                <Text
                  style={[
                    styles.stepLabel,
                    {
                      color: isCompleted ? COLORS.text : COLORS.textSecondary,
                      fontWeight: isCurrent ? '700' : '600',
                    },
                  ]}
                >
                  {step.label}
                </Text>
                {isCurrent && (
                  <Text style={[styles.stepDescription, { color: COLORS.textSecondary }]}>
                    {step.description}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Delivery Address */}
      <View style={[styles.addressSection, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
        <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Dirección de entrega</Text>
        {currentOrder.deliveryAddress && (
          <Text style={[styles.addressText, { color: COLORS.text }]}>
            {currentOrder.deliveryAddress}
          </Text>
        )}
        {currentOrder.notes && (
          <View style={styles.referencesContainer}>
            <Text style={[styles.referencesLabel, { color: COLORS.textSecondary }]}>Referencias:</Text>
            <Text style={[styles.referencesText, { color: COLORS.text }]}>{currentOrder.notes}</Text>
          </View>
        )}
      </View>

      {/* Auto-simulation indicator */}
      {!isDelivered && (
        <View style={[styles.simulationIndicator, { backgroundColor: COLORS.primary + '15', borderColor: COLORS.primary + '40' }]}>
          <Text style={[styles.simulationIndicatorText, { color: COLORS.primary }]}>
            ⚡ Simulación automática: El estado avanzará cada 2 segundos
          </Text>
        </View>
      )}

      {/* Satisfaction Survey Button */}
      {isDelivered && (
        <Button
          title="Continuar a encuesta de satisfacción"
          onPress={() => {
            (navigation as any).navigate('SatisfactionSurvey', { orderId });
          }}
          style={styles.surveyButton}
          size="large"
        />
      )}

      {/* Back Button */}
      <Button
        title="Volver"
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.error,
    marginBottom: 24,
    textAlign: 'center',
  },
  header: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  orderNumberCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },
  orderNumberLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 2,
    color: COLORS.primary,
  },
  timeCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  timeValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
  },
  deliveredCard: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 16,
    alignItems: 'center',
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
  },
  deliveredEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  deliveredTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 8,
  },
  deliveredMessage: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 22,
  },
  progressSection: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 24,
    letterSpacing: -0.3,
  },
  stepContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  stepIndicator: {
    alignItems: 'center',
    marginRight: 16,
  },
  stepCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepEmoji: {
    fontSize: 24,
  },
  stepLine: {
    width: 2,
    flex: 1,
    minHeight: 40,
    marginTop: 8,
  },
  stepContent: {
    flex: 1,
    paddingTop: 8,
  },
  stepLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginTop: 4,
  },
  addressSection: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },
  addressText: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
    marginBottom: 12,
  },
  referencesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  referencesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  referencesText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  simulationIndicator: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simulationIndicatorText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  surveyButton: {
    marginBottom: 16,
  },
  backButton: {
    marginBottom: 32,
  },
});

