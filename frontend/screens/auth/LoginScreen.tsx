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

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('test@greenfit.mx');
  const [password, setPassword] = useState('test123');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { login, setLoading: setAuthLoading } = useAuthStore();

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email inválido';
    }

    if (!password.trim()) {
      newErrors.password = 'La contraseña es requerida';
    } else if (password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setAuthLoading(true);

    try {
      // Use real authentication service
      const AuthService = await import('../../services/authService');
      const response = await AuthService.default.login({ email, password });

      if (response.ok && response.data) {
        // Login successful
        login(response.data.user, response.data.token);
        Alert.alert('Éxito', '¡Bienvenido a GreenFit!');
      } else {
        // Login failed
        Alert.alert('Error', response.message || 'Credenciales inválidas');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      Alert.alert('Error', 'Ocurrió un error al iniciar sesión');
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
          <Text style={styles.title}>🌱 GreenFit</Text>
          <Text style={styles.subtitle}>Inicia sesión en tu cuenta</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="tu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
            required
          />

          <Input
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            error={errors.password}
            required
          />

          <Button
            title={loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            onPress={handleLogin}
            disabled={loading}
            size="large"
            style={styles.loginButton}
          />

          <View style={styles.divider}>
            <Text style={styles.dividerText}>¿No tienes cuenta?</Text>
          </View>

          <Button
            title="Crear cuenta"
            onPress={() => navigation.navigate('Register')}
            variant="outline"
            size="large"
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            🔹 Customer: test@greenfit.mx / test123{'\n'}
            🔹 Empleado: chef@greenfit.mx / chef123{'\n'}
            🔹 Admin: admin@greenfit.com / admin123
          </Text>
          
          <Button
            title="🧑‍🍳 Acceso para Empleados"
            onPress={() => navigation.navigate('EmployeeLogin')}
            variant="outline"
            size="medium"
            style={styles.employeeButton}
          />
          
          <Button
            title="🔐 Panel de Administración"
            onPress={() => navigation.navigate('Admin')}
            variant="outline"
            size="medium"
            style={[styles.employeeButton, { backgroundColor: '#4f46e5', borderColor: '#4f46e5' }]}
          />
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
    marginBottom: 48,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#15803d',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#6b7280',
    textAlign: 'center',
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
  loginButton: {
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
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  employeeButton: {
    marginTop: 16,
  },
});