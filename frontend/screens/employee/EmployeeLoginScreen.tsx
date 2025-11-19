import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useEmployeeStore } from '../../stores/employeeStore';
import { useConfigStore } from '../../stores/configStore';
import { ToastManager } from '../../utils/ToastManager';

interface EmployeeLoginScreenProps {
  navigation: any;
}

const EmployeeLoginScreen: React.FC<EmployeeLoginScreenProps> = ({ navigation }) => {
  const { authenticate, isAuthenticating, error, clearError } = useEmployeeStore();
  const { config } = useConfigStore();
  
  const [email, setEmail] = useState('chef@greenfit.mx'); // Pre-filled for demo
  const [password, setPassword] = useState('chef123');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      ToastManager.error('Please enter both email and password');
      return;
    }

    clearError();
    
    const success = await authenticate(email.trim(), password);
    
    if (success) {
      // Navigate to Employee stack which will show the dashboard automatically
      navigation.navigate('Employee');
    }
  };

  const showTestCredentials = () => {
    Alert.alert(
      'Test Credentials',
      'Chef: chef@greenfit.mx / chef123\nKitchen: kitchen1@greenfit.mx / kitchen123\nAdmin: admin@greenfit.mx / admin123',
      [{ text: 'OK' }]
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🧑‍🍳 Kitchen Dashboard</Text>
          <Text style={styles.subtitle}>Employee Login</Text>
        </View>

        {/* Login Form */}
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="employee@greenfit.mx"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isAuthenticating}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              secureTextEntry
              editable={!isAuthenticating}
            />
          </View>

          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          <TouchableOpacity
            style={[
              styles.loginButton,
              { backgroundColor: config?.theme?.primaryColor || '#ff6b35' }
            ]}
            onPress={handleLogin}
            disabled={isAuthenticating}
          >
            {isAuthenticating ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.loginButtonText}>Login to Kitchen</Text>
            )}
          </TouchableOpacity>

          {/* Test Credentials Helper */}
          <TouchableOpacity
            style={styles.helpButton}
            onPress={showTestCredentials}
          >
            <Text style={styles.helpText}>📋 Show Test Credentials</Text>
          </TouchableOpacity>
        </View>

        {/* Back to Customer App */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          disabled={isAuthenticating}
        >
          <Text style={styles.backText}>← Back to Customer App</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f4e6', // Warm kitchen background
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#d2691e', // Kitchen orange
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#8b4513', // Dark brown
    fontWeight: '600',
  },
  form: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5d4e37', // Dark brown
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: '#deb887', // Tan
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#faf8f3',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  loginButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  helpButton: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  helpText: {
    fontSize: 14,
    color: '#856404',
    fontWeight: '500',
  },
  backButton: {
    alignItems: 'center',
    padding: 16,
  },
  backText: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '500',
  },
});

export default EmployeeLoginScreen;