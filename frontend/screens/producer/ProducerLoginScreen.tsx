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
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { ToastManager } from '../../utils/ToastManager';
import type { RootStackParamList } from '../../navigation/AppNavigator';

export const ProducerLoginScreen: React.FC = () => {
  const [email, setEmail] = useState('productor@nutrifresco.mx');
  const [password, setPassword] = useState('test123');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { login, setLoading: setAuthLoading } = useAuthStore();
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
        // Verificar que el usuario sea productor
        if (response.data.user.role !== 'producer') {
          ToastManager.error('Error', 'Esta cuenta no es de productor');
          return;
        }

        const user = { ...response.data.user, phone: response.data.user.phone ?? undefined };
        await login(user, response.data.token);
        ToastManager.loginSuccess(user.name || 'Productor');
        // Navigation será manejada automáticamente por AppNavigator
      } else {
        ToastManager.error('Error', response.message || 'Credenciales inválidas');
      }
    } catch (error) {
      console.error('❌ Producer login error:', error);
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
              <Text style={styles.brandName}>NUTRIFRESCO</Text>
              <Text style={styles.tagline}>Frescura que se nota, calidad que se siente</Text>
            </Animated.View>
            
            {/* Wavy Separator */}
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
            <Text style={styles.welcomeTitle}>Iniciar Sesión</Text>
            <Text style={styles.welcomeSubtitle}>Accede a tu cuenta de productor</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Usuario</Text>
              <View style={[
                styles.inputContainer,
                isEmailFocused && styles.inputContainerFocused
              ]}>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="correo@ejemplo.com"
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
                  placeholder="••••••"
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
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>Ingresar</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.backText}>
                ¿No eres productor? <Text style={styles.backLink}>Ir a inicio de sesión regular</Text>
              </Text>
            </TouchableOpacity>

            {/* Quick access - Only in dev */}
            {__DEV__ && (
              <View style={styles.devSection}>
                <Text style={styles.devHint}>Test: producer@greenfit.mx / test123</Text>
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
  
  // Header
  headerContainer: {
    width: '100%',
    marginBottom: 0,
  },
  gradientHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 50,
    paddingHorizontal: 24,
    position: 'relative',
  },
  headerContent: {
    alignItems: 'center',
    zIndex: 1,
  },
  logoImage: {
    width: 100,
    height: 100,
    marginBottom: 12,
  },
  brandName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: '400',
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
  
  // Welcome Section
  welcomeSection: {
    marginTop: 32,
    marginBottom: 32,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '400',
  },
  
  // Form
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  inputContainer: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputContainerFocused: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  textInput: {
    fontSize: 15,
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
    marginTop: 4,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  
  // Footer
  footer: {
    alignItems: 'center',
    marginTop: 16,
  },
  backText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  backLink: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  
  // Dev Section
  devSection: {
    marginTop: 24,
    alignItems: 'center',
  },
  devHint: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
  },
});

