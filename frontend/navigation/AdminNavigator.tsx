import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Admin Screens
import AdminLoginScreen from '../screens/admin/AdminLoginScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import InventoryManagementScreen from '../screens/admin/InventoryManagementScreen';
import MenuManagementScreen from '../screens/admin/MenuManagementScreen';
import UserManagementScreen from '../screens/admin/UserManagementScreen';
import AnalyticsScreen from '../screens/admin/AnalyticsScreen';
import IngredientDetailScreen from '../screens/admin/IngredientDetailScreen';
import PlateDetailScreen from '../screens/admin/PlateDetailScreen';

import { Text } from 'react-native';

// Icons for React Native (using Text component)
const TabIcon = ({ name, focused }: { name: string; focused: boolean }) => (
  <Text style={{ fontSize: 16, color: focused ? '#4F46E5' : '#6B7280' }}>
    {name}
  </Text>
);

export type AdminStackParamList = {
  AdminLogin: undefined;
  AdminTabs: undefined;
  IngredientDetail: {
    ingredientId?: string;
    mode: 'view' | 'edit' | 'create';
  };
  PlateDetail: {
    plateId?: string;
    mode: 'view' | 'edit' | 'create';
  };
};

export type AdminTabParamList = {
  Dashboard: undefined;
  Inventory: undefined;
  Menu: undefined;
  Users: undefined;
  Analytics: undefined;
};

const Stack = createStackNavigator<AdminStackParamList>();
const Tab = createBottomTabNavigator<AdminTabParamList>();

const AdminTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#4F46E5', // Admin theme - Indigo
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#E5E7EB',
        },
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#6B7280',
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={AdminDashboardScreen}
        options={{
          title: '📊 Admin Dashboard',
          tabBarIcon: ({ focused }) => <TabIcon name="📊" focused={focused} />,
        }}
      />
      
      <Tab.Screen 
        name="Inventory" 
        component={InventoryManagementScreen}
        options={{
          title: '📦 Inventory',
          tabBarIcon: ({ focused }) => <TabIcon name="📦" focused={focused} />,
        }}
      />
      
      <Tab.Screen 
        name="Menu" 
        component={MenuManagementScreen}
        options={{
          title: '🍽️ Menu',
          tabBarIcon: ({ focused }) => <TabIcon name="🍽️" focused={focused} />,
        }}
      />
      
      <Tab.Screen 
        name="Users" 
        component={UserManagementScreen}
        options={{
          title: '👥 Users',
          tabBarIcon: ({ focused }) => <TabIcon name="👥" focused={focused} />,
        }}
      />
      
      <Tab.Screen 
        name="Analytics" 
        component={AnalyticsScreen}
        options={{
          title: '📈 Analytics',
          tabBarIcon: ({ focused }) => <TabIcon name="📈" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
};

export const AdminNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="AdminLogin"
      screenOptions={{
        headerStyle: {
          backgroundColor: '#4F46E5',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="AdminLogin" 
        component={AdminLoginScreen}
        options={{
          title: '🔐 Admin Login',
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      
      <Stack.Screen 
        name="AdminTabs" 
        component={AdminTabNavigator}
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      
      <Stack.Screen 
        name="IngredientDetail" 
        component={IngredientDetailScreen}
        options={({ route }) => ({
          title: route.params.mode === 'create' ? '➕ New Ingredient' : 
                 route.params.mode === 'edit' ? '✏️ Edit Ingredient' : 
                 '👁️ Ingredient Details',
        })}
      />
      
      <Stack.Screen 
        name="PlateDetail" 
        component={PlateDetailScreen}
        options={({ route }) => ({
          title: route.params.mode === 'create' ? '➕ New Plate' : 
                 route.params.mode === 'edit' ? '✏️ Edit Plate' : 
                 '👁️ Plate Details',
        })}
      />
    </Stack.Navigator>
  );
};