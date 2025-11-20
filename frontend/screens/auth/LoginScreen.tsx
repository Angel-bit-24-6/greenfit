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
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { ToastManager } from '../../utils/ToastManager';
import type { RootStackParamList } from '../../navigation/AppNavigator';

const { width } = Dimensions.get('window');

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('test@greenfit.mx');
  const [password, setPassword] = useState('test123');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { login, setLoading: setAuthLoading, user, isAuthenticated } = useAuthStore();
  const { subscription } = useSubscriptionStore();
  const { getThemeColors, currentTheme, colorMode } = useThemeStore();
  const COLORS = getThemeColors();
  
  const styles = useMemo(() => createStyles(COLORS, colorMode), [currentTheme.id, colorMode]);

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
        bounces={false}
      >
        {/* Header with Gradient */}
        <View style={styles.headerContainer}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.gradientHeader}
          >
            <Animated.View
              style={[
                styles.headerContent,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY }],
                },
              ]}
            >
              <Image 
                source={require('../../public/logoapp.png')} 
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={[styles.brandName, { color: COLORS.text }]}>NUTRIFRESCO</Text>
            </Animated.View>
            
            {/* Wavy Separator - Simplified */}
            <View style={styles.wavyContainer}>
              <View style={[styles.wavyShape, { backgroundColor: COLORS.background }]} />
            </View>
          </LinearGradient>
        </View>

        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY }],
            },
          ]}
        >
          {/* Welcome Text */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>
              {isAuthenticated && user ? `Bienvenido, ${user.name?.split(' ')[0] || 'Usuario'}` : 'Bienvenido de nuevo'}
            </Text>
            {isAuthenticated && subscription && (
              <View style={[styles.subscriptionBadge, { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary }]}>
                <Text style={[styles.subscriptionBadgeText, { color: COLORS.primary }]}>
                  {subscription.plan === 'BASIC' && '🥬'} 
                  {subscription.plan === 'STANDARD' && '🌱'} 
                  {subscription.plan === 'PREMIUM' && '🌟'} 
                  {' '}
                  Plan {subscription.plan === 'BASIC' ? 'Básico' : subscription.plan === 'STANDARD' ? 'Estándar' : 'Premium'}
                  {' • '}
                  {subscription.limitInKg} kg/mes
                </Text>
              </View>
            )}
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={[
                styles.inputContainer,
                isEmailFocused && styles.inputContainerFocused
              ]}>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="User name"
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
              <View style={[
                styles.inputContainer,
                isPasswordFocused && styles.inputContainerFocused
              ]}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor={COLORS.textSecondary}
                  secureTextEntry={!showPassword}
                  style={styles.textInput}
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                />
                <TouchableOpacity 
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.eyeIconText}>
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </Text>
                </TouchableOpacity>
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

            {/* OR Separator */}
            <View style={styles.orContainer}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>OR</Text>
              <View style={styles.orLine} />
            </View>

            {/* Social Login */}
            <View style={styles.socialContainer}>
              <TouchableOpacity style={styles.socialButton}>
                <Text style={styles.socialIcon}>G</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.socialButton, styles.socialButtonFacebook]}>
                <Text style={styles.socialIcon}>f</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.socialButton, styles.socialButtonApple]}>
                <Text style={styles.socialIcon}>🍎</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
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

const createStyles = (COLORS: any, colorMode: 'dark' | 'light') => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  
  // --- HEADER CON GRADIENTE ---
  headerContainer: {
    width: '100%',
    marginBottom: 0,
  },
  gradientHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
    paddingHorizontal: 24,
    position: 'relative',
  },
  headerContent: {
    alignItems: 'center',
    zIndex: 1,
  },
  logoImage: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  brandName: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  wavyContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    overflow: 'hidden',
  },
  wavyShape: {
    position: 'absolute',
    bottom: 0,
    left: -50,
    right: -50,
    height: 80,
    borderTopLeftRadius: 100,
    borderTopRightRadius: 100,
    transform: [{ translateY: 20 }],
  },
  
  // --- WELCOME SECTION ---
  welcomeSection: {
    marginTop: 32,
    marginBottom: 40,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.text,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  subscriptionBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 8,
    alignSelf: 'center',
  },
  subscriptionBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  
  // --- FORMULARIO ---
  form: {
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  inputContainer: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputContainerFocused: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  textInput: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
    padding: 0,
    fontWeight: '400',
  },
  eyeIcon: {
    padding: 4,
  },
  eyeIconText: {
    fontSize: 18,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.error,
    marginTop: 6,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: COLORS.background,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  
  // --- SOCIAL LOGIN ---
  orContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  orText: {
    marginHorizontal: 16,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 1,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  socialButtonFacebook: {
    backgroundColor: '#1877F2',
    borderColor: '#1877F2',
  },
  socialButtonApple: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  socialIcon: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  
  // --- FOOTER ---
  footer: {
    alignItems: 'center',
    marginTop: 8,
  },
  registerText: {
    fontSize: 15,
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