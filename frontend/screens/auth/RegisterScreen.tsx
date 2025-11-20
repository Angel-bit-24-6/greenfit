import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../stores/authStore';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import AuthService from '../../services/authService';
import { ToastManager } from '../../utils/ToastManager';

interface FormData {
  name: string;
  email: string;
  phone:string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
}

export const RegisterScreen: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { login, setLoading: setAuthLoading } = useAuthStore();

  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
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
      // Use real authentication service
      const response = await AuthService.register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password
      });

      if (response.ok && response.data) {
        // Registration successful
        login(response.data.user, response.data.token);
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
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>🌱 Únete a GreenFit</Text>
          <Text style={styles.subtitle}>Crea tu cuenta y comienza tu viaje saludable</Text>
        </View>

        <View style={styles.form}>
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

          <Button
            title={loading ? "Creando cuenta..." : "Crear Cuenta"}
            onPress={handleRegister}
            disabled={loading}
            size="large"
            style={styles.registerButton}
          />

          <View style={styles.divider}>
            <Text style={styles.dividerText}>¿Ya tienes cuenta?</Text>
          </View>

          <Button
            title="Iniciar sesión"
            onPress={() => navigation.navigate('Login')}
            variant="outline"
            size="large"
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Al crear una cuenta, aceptas nuestros{'\n'}
            Términos de Servicio y Política de Privacidad
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#15803d',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
    color: '#6b7280',
  },
  footer: {
    marginTop: 24,
    padding: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 18,
  },
});