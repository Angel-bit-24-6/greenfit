import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useAuthStore } from '../../stores/authStore';
import type { RootStackParamList } from '../../navigation/AppNavigator';

const { width, height } = Dimensions.get('window');

// Color palette based on #80f269
const COLORS = {
  primary: '#80f269',
  primaryDark: '#6dd855',
  primaryLight: '#a5f892',
  background: '#000000',
  surface: 'rgba(255, 255, 255, 0.05)',
  surfaceElevated: 'rgba(255, 255, 255, 0.1)',
  text: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  border: 'rgba(128, 242, 105, 0.2)',
  error: '#ff6b6b',
};

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('test@greenfit.mx');
  const [password, setPassword] = useState('test123');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { login, setLoading: setAuthLoading } = useAuthStore();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Glow animation loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Logo pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoScale, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

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
      const AuthService = await import('../../services/authService');
      const response = await AuthService.default.login({ email, password });

      if (response.ok && response.data) {
        const user = {
          ...response.data.user,
          phone: response.data.user.phone ?? undefined,
        };
        login(user, response.data.token);
        Alert.alert('Éxito', '¡Bienvenido a GreenFit!');
      } else {
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
      {/* Animated background gradient */}
      <Animated.View
        style={[
          styles.backgroundGradient,
          {
            opacity: fadeAnim,
          },
        ]}
      />

      {/* Glowing orb effects */}
      <Animated.View
        style={[
          styles.glowOrb1,
          {
            opacity: glowOpacity,
            transform: [{ scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] }) }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.glowOrb2,
          {
            opacity: glowOpacity,
            transform: [{ scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] }) }],
          },
        ]}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          {/* Logo section */}
          <View style={styles.logoContainer}>
            <Animated.View
              style={[
                styles.logoCircle,
                {
                  transform: [{ scale: logoScale }],
                },
              ]}
            >
              <Text style={styles.logoEmoji}>🌱</Text>
            </Animated.View>
            <Animated.Text
              style={[
                styles.title,
                {
                  opacity: fadeAnim,
                },
              ]}
            >
              GreenFit
            </Animated.Text>
            <Text style={styles.subtitle}>Bienvenido de nuevo</Text>
          </View>

          {/* Form card with glassmorphism */}
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Iniciar Sesión</Text>
              <Text style={styles.formSubtitle}>Ingresa tus credenciales</Text>
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="tu@email.com"
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.textInput}
                />
                {errors.email && (
                  <Text style={styles.errorText}>{errors.email}</Text>
                )}
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Contraseña</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.textSecondary}
                  secureTextEntry
                  style={styles.textInput}
                />
                {errors.password && (
                  <Text style={styles.errorText}>{errors.password}</Text>
                )}
              </View>
            </View>

            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.background} size="small" />
              ) : (
                <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('Register')}
              style={styles.registerLink}
            >
              <Text style={styles.registerText}>
                ¿No tienes cuenta?{' '}
                <Text style={styles.registerTextBold}>Crear cuenta</Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quick access buttons */}
          <View style={styles.quickAccess}>
            <TouchableOpacity
              onPress={() => navigation.navigate('EmployeeLogin')}
              style={styles.quickButton}
            >
              <Text style={styles.quickButtonText}>🧑‍🍳 Empleado</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('Admin')}
              style={styles.quickButton}
            >
              <Text style={styles.quickButtonText}>🔐 Admin</Text>
            </TouchableOpacity>
          </View>

          {/* Test credentials hint */}
          <View style={styles.credentialsHint}>
            <Text style={styles.credentialsText}>
              Test: test@greenfit.mx / test123
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.background,
  },
  glowOrb1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: COLORS.primary,
    top: -100,
    right: -100,
    opacity: 0.3,
  },
  glowOrb2: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: COLORS.primaryLight,
    bottom: -50,
    left: -50,
    opacity: 0.2,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  content: {
    flex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
    marginTop: 20,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  logoEmoji: {
    fontSize: 50,
  },
  title: {
    fontSize: 42,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -1,
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '400',
    letterSpacing: 0.5,
  },
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    padding: 28,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 10,
  },
  formHeader: {
    marginBottom: 28,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  formSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '400',
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  textInput: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    color: COLORS.text,
    minHeight: 52,
    fontWeight: '400',
  },
  errorText: {
    fontSize: 13,
    color: COLORS.error,
    marginTop: 6,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: COLORS.background,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  registerLink: {
    alignItems: 'center',
  },
  registerText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '400',
  },
  registerTextBold: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  quickAccess: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
  },
  credentialsHint: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  credentialsText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '400',
  },
});
