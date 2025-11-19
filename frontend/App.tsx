import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Alert } from 'react-native';
import Toast from 'react-native-toast-message';
import { AppNavigator } from './navigation/AppNavigator';
import { useConfigStore } from './stores/configStore';
import { useCatalogStore } from './stores/catalogStore';
import { toastConfig } from './config/toastConfig';

// Config files will be loaded with require() to avoid import.meta issues

export default function App() {
  const { setAppConfig, setThemeConfig } = useConfigStore();
  const { fetchCatalog } = useCatalogStore();

  useEffect(() => {
    // Load configurations
    loadConfigurations();
    // Load catalog data using the store
    loadInitialData();
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
      Alert.alert('Error', 'No se pudieron cargar las configuraciones');
    }
  };

  const loadInitialData = async () => {
    // Wait a moment for config to load
    setTimeout(async () => {
      try {
        console.log('🚀 Loading initial catalog data...');
        await fetchCatalog();
      } catch (error) {
        console.error('❌ Error loading initial data:', error);
        // Don't show alert for catalog errors, just log them
      }
    }, 500); // Increased timeout to ensure config is loaded
  };

  return (
    <View style={styles.container}>
      <AppNavigator />
      <Toast config={toastConfig} />
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
