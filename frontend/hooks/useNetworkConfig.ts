import { useMemo } from 'react';
import networkConfig from '../config/network.json';

type Environment = 'development' | 'localhost';

interface NetworkConfig {
  API_BASE_URL: string;
  BACKEND_URL: string;
  FRONTEND_URL: string;
}

export const useNetworkConfig = (environment: Environment = 'development'): NetworkConfig => {
  return useMemo(() => {
    return networkConfig[environment];
  }, [environment]);
};

// Función helper para obtener la configuración sin hook (para usar en stores)
export const getNetworkConfig = (environment: Environment = 'development'): NetworkConfig => {
  return networkConfig[environment];
};

export default useNetworkConfig;