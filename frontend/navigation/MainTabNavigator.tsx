import React, { useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, StyleSheet, Platform } from 'react-native';

// Screens
import { HomeScreen } from '../screens/main/HomeScreen';
import { MenuScreen } from '../screens/main/MenuScreen';
import { CartScreen } from '../screens/main/CartScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import { useCartStore } from '../stores/cartStore';
import { useThemeStore } from '../stores/themeStore';

export type MainTabParamList = {
  HomeTab: undefined;
  MenuTab: undefined;
  CartTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabNavigator: React.FC = () => {
  const { getTotalItems } = useCartStore();
  const cartItemsCount = getTotalItems();
  const { getThemeColors, currentTheme, colorMode } = useThemeStore();
  const COLORS = getThemeColors();
  
  const tabBarStyles = useMemo(() => createTabBarStyles(COLORS), [currentTheme.id]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        // Eliminamos los colores por defecto; los manejamos en el icono y label
        tabBarStyle: [
          tabBarStyles.tabBar,
          {
            backgroundColor: COLORS.background, // Fondo de pantalla, no 'surface'
          }
        ],
        tabBarLabelStyle: tabBarStyles.tabBarLabel,
        tabBarItemStyle: tabBarStyles.tabBarItem,
        tabBarBadgeStyle: tabBarStyles.tabBarBadge,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Inicio',
          tabBarIcon: ({ focused }) => (
            <Text style={[
              tabBarStyles.icon,
              { 
                color: focused ? COLORS.primary : COLORS.textSecondary,
              }
            ]}>
              🏠
            </Text>
          ),
        }}
      />
      
      <Tab.Screen
        name="MenuTab"
        component={MenuScreen}
        options={{
          tabBarLabel: 'Menú',
          tabBarIcon: ({ focused }) => (
            <Text style={[
              tabBarStyles.icon,
              { 
                color: focused ? COLORS.primary : COLORS.textSecondary,
              }
            ]}>
              🍽️
            </Text>
          ),
        }}
      />
      
      <Tab.Screen
        name="CartTab"
        component={CartScreen}
        options={{
          tabBarLabel: 'Carrito',
          tabBarBadge: cartItemsCount > 0 ? cartItemsCount : undefined,
          tabBarIcon: ({ focused }) => (
            <Text style={[
              tabBarStyles.icon,
              { 
                color: focused ? COLORS.primary : COLORS.textSecondary,
              }
            ]}>
              🛒
            </Text>
          ),
        }}
      />
      
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ focused }) => (
            <Text style={[
              tabBarStyles.icon,
              { 
                color: focused ? COLORS.primary : COLORS.textSecondary,
              }
            ]}>
              👤
            </Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const createTabBarStyles = (COLORS: any) => StyleSheet.create({
  tabBar: {
    // Eliminamos completamente la sombra y el borde superior
    height: Platform.OS === 'ios' ? 80 : 60, // Altura más estándar
    paddingBottom: Platform.OS === 'ios' ? 16 : 8,
    paddingTop: 8,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 2, // Un pequeño margen inferior para mejor alineación
  },
  tabBarItem: {
    // Sin padding extra
  },
  tabBarBadge: {
    backgroundColor: COLORS.primary, // Fondo sólido primario
    color: COLORS.background, // Texto blanco (o del fondo)
    fontSize: 10,
    fontWeight: '700',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    // Eliminamos el borde
    paddingHorizontal: 3,
    lineHeight: 14, // Para centrar verticalmente el texto
  },
  icon: {
    fontSize: 22, // Tamaño consistente, sin cambiar al estar activo
    textAlign: 'center',
    marginBottom: 2, // Pequeño margen para separar del texto
  },
});