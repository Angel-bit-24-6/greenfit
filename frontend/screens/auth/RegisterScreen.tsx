import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import AuthService from '../../services/authService';
import { ToastManager } from '../../utils/ToastManager';
import type { SubscriptionPlan } from '../../stores/subscriptionStore';

interface FormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  subscriptionPlan: SubscriptionPlan;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
}

const SUBSCRIPTION_PLANS = [
  {
    id: 'BASIC' as SubscriptionPlan,
    name: 'Básico',
    limit: 5,
    description: 'Solo frutas y verduras',
    features: ['Frutas', 'Verduras'],
    emoji: '🥬',
  },
  {
    id: 'STANDARD' as SubscriptionPlan,
    name: 'Estándar',
    limit: 8,
    description: 'Frutas, verduras + más',
    features: ['Frutas', 'Verduras', 'Leguminosas', 'Hierbas', 'Snacks', 'Café', 'Chocolate'],
    emoji: '🌱',
  },
  {
    id: 'PREMIUM' as SubscriptionPlan,
    name: 'Premium',
    limit: 10,
    description: 'Todo lo anterior + proteínas',
    features: ['Todo del Estándar', 'Proteínas frescas'],
    emoji: '🌟',
  },
];

export const RegisterScreen: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    subscriptionPlan: 'BASIC',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { login, setLoading: setAuthLoading } = useAuthStore();
  const { getThemeColors, currentTheme, colorMode } = useThemeStore();
  const COLORS = getThemeColors();
  const styles = useMemo(() => createStyles(COLORS, colorMode), [currentTheme.id, colorMode]);

  const updateField = (field: keyof FormData, value: string | SubscriptionPlan) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field as keyof FormErrors]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'El nombre debe tener al menos 2 caracteres';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'El teléfono es requerido';
    } else if (!/^\+?[\d\s-()]{10,}$/.test(formData.phone)) {
      newErrors.phone = 'Teléfono inválido';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'Confirma tu contraseña';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setAuthLoading(true);

    try {
      // Use real authentication service with subscription plan
      const response = await AuthService.register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        subscriptionPlan: formData.subscriptionPlan,
      });

      if (response.ok && response.data) {
        // Registration successful
        const user = {
          ...response.data.user,
          phone: response.data.user.phone ?? undefined,
        };
        await login(user, response.data.token);
        ToastManager.success('¡Bienvenido!', 'Tu cuenta ha sido creada exitosamente');
      } else {
        // Registration failed
        ToastManager.error('Error', response.message || 'Error al crear la cuenta');
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
      ToastManager.error('Error', 'Ocurrió un error al crear tu cuenta');
    } finally {
      setLoading(false);
      setAuthLoading(false);
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
        <View style={styles.header}>
          <Text style={[styles.title, { color: COLORS.text }]}>🌱 Únete a NUTRIFRESCO</Text>
          <Text style={[styles.subtitle, { color: COLORS.textSecondary }]}>
            Crea tu cuenta y accede a productos frescos locales
          </Text>
        </View>

        <View style={[styles.form, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
          <Input
            label="Nombre completo"
            value={formData.name}
            onChangeText={(value) => updateField('name', value)}
            placeholder="Tu nombre"
            autoCapitalize="words"
            error={errors.name}
            required
          />

          <Input
            label="Email"
            value={formData.email}
            onChangeText={(value) => updateField('email', value)}
            placeholder="tu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
            required
          />

          <Input
            label="Teléfono"
            value={formData.phone}
            onChangeText={(value) => updateField('phone', value)}
            placeholder="+52 961 123 4567"
            keyboardType="phone-pad"
            error={errors.phone}
            required
          />

          <Input
            label="Contraseña"
            value={formData.password}
            onChangeText={(value) => updateField('password', value)}
            placeholder="••••••••"
            secureTextEntry
            error={errors.password}
            required
          />

          <Input
            label="Confirmar contraseña"
            value={formData.confirmPassword}
            onChangeText={(value) => updateField('confirmPassword', value)}
            placeholder="••••••••"
            secureTextEntry
            error={errors.confirmPassword}
            required
          />

          {/* Plan Selection */}
          <View style={styles.planSection}>
            <Text style={[styles.planSectionTitle, { color: COLORS.text }]}>
              Selecciona tu plan de suscripción
            </Text>
            <Text style={[styles.planSectionSubtitle, { color: COLORS.textSecondary }]}>
              Puedes cambiarlo después
            </Text>

            <View style={styles.plansContainer}>
              {SUBSCRIPTION_PLANS.map((plan) => {
                const isSelected = formData.subscriptionPlan === plan.id;
                return (
                  <TouchableOpacity
                    key={plan.id}
                    style={[
                      styles.planCard,
                      {
                        backgroundColor: isSelected ? COLORS.primaryLight : COLORS.surface,
                        borderColor: isSelected ? COLORS.primary : COLORS.border,
                        borderWidth: isSelected ? 2 : 1,
                      },
                    ]}
                    onPress={() => updateField('subscriptionPlan', plan.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.planEmoji}>{plan.emoji}</Text>
                    <Text style={[styles.planName, { color: COLORS.text }]}>
                      {plan.name}
                    </Text>
                    <Text style={[styles.planLimit, { color: COLORS.primary }]}>
                      {plan.limit} kg/mes
                    </Text>
                    <Text style={[styles.planDescription, { color: COLORS.textSecondary }]}>
                      {plan.description}
                    </Text>
                    {isSelected && (
                      <View style={[styles.selectedBadge, { backgroundColor: COLORS.primary }]}>
                        <Text style={styles.selectedText}>✓ Seleccionado</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <Button
            title={loading ? "Creando cuenta..." : "Crear Cuenta"}
            onPress={handleRegister}
            disabled={loading}
            size="large"
            style={styles.registerButton}
          />

          <View style={styles.divider}>
            <Text style={[styles.dividerText, { color: COLORS.textSecondary }]}>
              ¿Ya tienes cuenta?
            </Text>
          </View>

          <Button
            title="Iniciar sesión"
            onPress={() => navigation.navigate('Login')}
            variant="outline"
            size="large"
          />
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: COLORS.textSecondary }]}>
            Al crear una cuenta, aceptas nuestros{'\n'}
            Términos de Servicio y Política de Privacidad
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = (COLORS: any, colorMode: 'dark' | 'light') => StyleSheet.create({
  container: {
    flex: 1,
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
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
  },
  planSection: {
    marginTop: 24,
    marginBottom: 16,
  },
  planSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  planSectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  plansContainer: {
    gap: 12,
  },
  planCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  planEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  planLimit: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
  },
  selectedBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  selectedText: {
    color: COLORS.background,
    fontSize: 12,
    fontWeight: '700',
  },
  registerButton: {
    marginTop: 8,
    marginBottom: 24,
  },
  divider: {
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerText: {
    fontSize: 16,
  },
  footer: {
    marginTop: 24,
    padding: 16,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
