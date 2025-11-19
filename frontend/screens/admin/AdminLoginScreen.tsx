import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { useAdminStore } from '../../stores/adminStore';
import { useEmployeeStore } from '../../stores/employeeStore';
import { Button } from '../../components/ui/Button';
import { useConfigStore } from '../../stores/configStore';

type AdminLoginScreenNavigationProp = StackNavigationProp<AdminStackParamList, 'AdminLogin'>;

interface Props {
  navigation: AdminLoginScreenNavigationProp;
}

const AdminLoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('admin@greenfit.mx'); // Default for testing
  const [password, setPassword] = useState('admin123'); // Default for testing
  const [isLoading, setIsLoading] = useState(false);

  const setAdminUser = useAdminStore((state) => state.setAdminUser);
  const clearError = useAdminStore((state) => state.clearError);
  const employeeAuthenticate = useEmployeeStore((state) => state.authenticate);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    try {
      setIsLoading(true);
      clearError();

      // Use JWT authentication but ONLY store in adminStore, NOT in authStore
      const AuthService = await import('../../services/authService');
      const response = await AuthService.default.login({ email, password });

      if (response.ok && response.data) {
        // Verify user is admin
        if (response.data.user.role === 'admin') {
          // Store admin info in adminStore with JWT token for API calls
          await setAdminUser({
            id: response.data.user.id,
            name: response.data.user.name,
            email: response.data.user.email,
            role: response.data.user.role,
            token: response.data.token, // Store token in adminStore
          });

          console.log('✅ Admin login successful:', response.data.user.name);
          Alert.alert('Bienvenido', `Hola ${response.data.user.name}`);
          navigation.replace('AdminTabs');
        } else {
          Alert.alert('Access Denied', 'Admin privileges required');
        }
      } else {
        Alert.alert('Login Failed', response.message || 'Invalid credentials');
      }
    } catch (error) {
      console.error('❌ Admin login error:', error);
      Alert.alert('Error', 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔐 Admin Panel</Text>
        <Text style={styles.subtitle}>GreenFit Management System</Text>
      </View>

      {/* Botón de regreso */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.navigate('Login' as never)}
      >
        <Text style={styles.backButtonText}>← Volver al Login Principal</Text>
      </TouchableOpacity>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="admin@greenfit.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter admin password"
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        <Button
          title={isLoading ? "Signing in..." : "Sign In"}
          onPress={handleLogin}
          style={styles.loginButton}
          disabled={isLoading || !email || !password}
        />

        <View style={styles.info}>
          <Text style={styles.infoText}>⚡ Admin Access Required</Text>
          <Text style={styles.infoSubtext}>
            Only users with admin role can access this panel
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>GreenFit Admin v1.0</Text>
        <Text style={styles.footerText}>🌱 Healthy Food Management</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4F46E5',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  backButtonText: {
    color: '#4F46E5',
    fontSize: 16,
    fontWeight: '500',
  },
  form: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  loginButton: {
    backgroundColor: '#4F46E5',
    marginTop: 10,
  },
  info: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4F46E5',
  },
  infoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
    marginBottom: 4,
  },
  infoSubtext: {
    fontSize: 12,
    color: '#6366F1',
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
});

export default AdminLoginScreen;