import { useState, useEffect } from 'react';
import { AppConfig, ThemeConfig } from '../types/config';
import { getNetworkConfig } from './useNetworkConfig';

// Importamos las configuraciones JSON estáticamente
import appConfigJson from '../config/app.json';
import themeConfigJson from '../config/theme.json';

export const useConfig = () => {
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [themeConfig, setThemeConfig] = useState<ThemeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true);
        
        // Obtenemos la configuración de red y la integramos con la configuración de app
        const networkConfig = getNetworkConfig();
        const mergedAppConfig = {
          ...appConfigJson,
          api: {
            ...appConfigJson.api,
            baseUrl: networkConfig.API_BASE_URL
          }
        } as AppConfig;
        
        setAppConfig(mergedAppConfig);
        setThemeConfig(themeConfigJson as ThemeConfig);
        
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error cargando configuración');
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  return {
    appConfig,
    themeConfig,
    loading,
    error,
    reloadConfig: () => {
      // Función para recargar configuración si es necesario
      setLoading(true);
      setTimeout(() => {
        const networkConfig = getNetworkConfig();
        const mergedAppConfig = {
          ...appConfigJson,
          api: {
            ...appConfigJson.api,
            baseUrl: networkConfig.API_BASE_URL
          }
        } as AppConfig;
        
        setAppConfig(mergedAppConfig);
        setThemeConfig(themeConfigJson as ThemeConfig);
        setLoading(false);
      }, 100);
    }
  };
};

export const useTheme = () => {
  const { themeConfig, loading, error } = useConfig();
  
  return {
    theme: themeConfig,
    colors: themeConfig?.colors,
    typography: themeConfig?.typography,
    spacing: themeConfig?.spacing,
    borderRadius: themeConfig?.borderRadius,
    loading,
    error
  };
};