// Tipos para la configuración de la aplicación

export interface ColorPalette {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

export interface ThemeConfig {
  name: string;
  version: string;
  colors: {
    primary: ColorPalette;
    secondary: ColorPalette;
    accent: ColorPalette;
    success: string;
    warning: string;
    error: string;
    info: string;
    neutral: ColorPalette;
  };
  typography: {
    fontFamily: {
      body: string;
      heading: string;
    };
    fontSize: {
      xs: number;
      sm: number;
      base: number;
      lg: number;
      xl: number;
      '2xl': number;
      '3xl': number;
      '4xl': number;
    };
    fontWeight: {
      normal: string;
      medium: string;
      semibold: string;
      bold: string;
    };
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    '2xl': number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
  };
}

export interface AppConfig {
  name: string;
  version: string;
  description: string;
  logo: {
    primary: string;
    secondary: string;
    icon: string;
  };
  api: {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
  };
  features: {
    chat: {
      enabled: boolean;
      maxMessages: number;
      typingIndicator: boolean;
    };
    customPlates: {
      enabled: boolean;
      maxIngredients: number;
      allowDuplicates: boolean;
    };
    payments: {
      enabled: boolean;
      providers: string[];
      currency: string;
    };
    offline: {
      enabled: boolean;
      cacheTimeout: number;
    };
  };
  business: {
    name: string;
    tagline: string;
    phone: string;
    email: string;
    website: string;
    address: string;
  };
  ui: {
    splash: {
      backgroundColor: string;
      logo: string;
      duration: number;
    };
    animations: {
      enabled: boolean;
      duration: number;
    };
    haptics: {
      enabled: boolean;
    };
  };
}