import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { AppNavigator } from './navigation/AppNavigator';
import { useConfigStore } from './stores/configStore';
import { useThemeStore } from './stores/themeStore';
import { toastConfig } from './config/toastConfig';
import { AlertManagerProvider } from './utils/AlertManager';
import { ToastManager } from './utils/ToastManager';

// Config files will be loaded with require() to avoid import.meta issues

export default function App() {
  const { setAppConfig, setThemeConfig } = useConfigStore();
  const { initializeTheme } = useThemeStore();

  useEffect(() => {
    // Initialize theme
    initializeTheme();
    // Load configurations
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    try {
      // Load configurations with network config integration
      const { getNetworkConfig } = require('./hooks/useNetworkConfig');
      const appConfigJson = require('./config/app.json');
      const themeConfigJson = require('./config/theme.json');
      
      // Get network configuration
      const networkConfig = getNetworkConfig('development');
      
      // Merge app config with network config
      const mergedAppConfig = {
        ...appConfigJson,
        api: {
          ...appConfigJson.api,
          baseUrl: networkConfig.API_BASE_URL
        }
      };
      
      setAppConfig(mergedAppConfig);
      setThemeConfig(themeConfigJson);
      
      console.log('✅ Configurations loaded successfully');
      console.log('📡 API Base URL:', networkConfig.API_BASE_URL);
    } catch (error) {
      console.error('❌ Error loading configurations:', error);
      ToastManager.error('Error', 'No se pudieron cargar las configuraciones');
    }
  };

  return (
    <AlertManagerProvider>
      <View style={styles.container}>
        <AppNavigator />
        <Toast config={toastConfig} />
        <StatusBar style="light" />
      </View>
    </AlertManagerProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
