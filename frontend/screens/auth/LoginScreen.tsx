import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { ToastManager } from '../../utils/ToastManager';
import type { RootStackParamList } from '../../navigation/AppNavigator';

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('test@greenfit.mx');
  const [password, setPassword] = useState('test123');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { login, setLoading: setAuthLoading } = useAuthStore();
  const { getThemeColors, currentTheme } = useThemeStore();
  const COLORS = getThemeColors();
  
  const styles = useMemo(() => createStyles(COLORS), [currentTheme.id]);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email.trim()) newErrors.email = 'El email es requerido';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email inválido';
    if (!password.trim()) newErrors.password = 'La contraseña es requerida';
    else if (password.length < 6) newErrors.password = 'Mínimo 6 caracteres';

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
        const user = { ...response.data.user, phone: response.data.user.phone ?? undefined };
        await login(user, response.data.token);
        ToastManager.loginSuccess(user.name || 'Usuario');
      } else {
        ToastManager.error('Error', response.message || 'Credenciales inválidas');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      ToastManager.error('Error', 'No se pudo iniciar sesión');
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY }],
            },
          ]}
        >
          {/* Logo & Title */}
          <View style={styles.header}>
            <Text style={styles.logo}>🌱</Text>
            <Text style={styles.title}>GreenFit</Text>
            <Text style={styles.subtitle}>Bienvenido de nuevo</Text>
          </View>

          {/* Form - Sin card, solo inputs y botón */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={[styles.inputRow, isEmailFocused && styles.inputRowFocused]}>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="tu@email.com"
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.textInput}
                  onFocus={() => setIsEmailFocused(true)}
                  onBlur={() => setIsEmailFocused(false)}
                />
              </View>
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contraseña</Text>
              <View style={[styles.inputRow, isPasswordFocused && styles.inputRowFocused]}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.textSecondary}
                  secureTextEntry
                  style={styles.textInput}
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                />
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.background} size="small" />
              ) : (
                <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Secondary Actions - Minimal */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerText}>
                ¿No tienes cuenta? <Text style={styles.registerLink}>Crear cuenta</Text>
              </Text>
            </TouchableOpacity>

            {/* Quick access - Only in dev */}
            {__DEV__ && (
              <View style={styles.devSection}>
                <TouchableOpacity onPress={() => navigation.navigate('EmployeeLogin')} style={styles.devButton}>
                  <Text style={styles.devButtonText}>🧑‍🍳 Empleado</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('Admin')} style={styles.devButton}>
                  <Text style={styles.devButtonText}>🔐 Admin</Text>
                </TouchableOpacity>
                <Text style={styles.devHint}>Test: test@greenfit.mx / test123</Text>
              </View>
            )}
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = (COLORS: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    paddingBottom: 40,
  },
  content: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logo: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -1.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: COLORS.textSecondary,
    fontWeight: '400',
  },

  // --- FORMULARIO SIN CARD ---
  form: {
    marginBottom: 40,
  },
  inputGroup: {
    marginBottom: 28,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  inputRow: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.border,
    paddingBottom: 12,
  },
  inputRowFocused: {
    borderBottomColor: COLORS.primary,
  },
  textInput: {
    fontSize: 18,
    color: COLORS.text,
    padding: 0,
    height: 40,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error,
    marginTop: 8,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    borderRadius: 12, // Solo un toque de redondeo en botones
    alignItems: 'center',
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: COLORS.background,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // --- PIE DE PÁGINA ---
  footer: {
    alignItems: 'center',
  },
  registerText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '400',
  },
  registerLink: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  // --- SECCIÓN DE DESARROLLO (Solo en modo DEV) ---
  devSection: {
    marginTop: 30,
    alignItems: 'center',
    width: '100%',
  },
  devButton: {
    backgroundColor: COLORS.surface,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  devButtonText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  devHint: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 16,
    fontStyle: 'italic',
  },
});