import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../stores/authStore';
import { useAdminStore } from '../stores/adminStore';

// Auth Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { SubscriptionPaymentScreen } from '../screens/auth/SubscriptionPaymentScreen';
import EmployeeLoginScreen from '../screens/employee/EmployeeLoginScreen';
import { ProducerLoginScreen } from '../screens/producer/ProducerLoginScreen';

// Main Navigation
import { MainTabNavigator } from './MainTabNavigator';
import { EmployeeAppNavigator } from './EmployeeAppNavigator';
import { AdminNavigator } from './AdminNavigator';
import { ProducerNavigator } from './ProducerNavigator';
import { CustomPlateBuilderScreen } from '../screens/main/CustomPlateBuilderScreen';
import { CheckoutScreen } from '../screens/CheckoutScreen';
import OrdersScreen from '../screens/OrdersScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import { OrderTrackingScreen } from '../screens/OrderTrackingScreen';
import { SatisfactionSurveyScreen } from '../screens/SatisfactionSurveyScreen';

// Settings Screens
import { ThemeSettingsScreen } from '../screens/main/ThemeSettingsScreen';
import type { SubscriptionPlan } from '../stores/subscriptionStore';

// Navigation Types
export type RootStackParamList = {
  Login: undefined;
  Register: { paymentConfirmed?: boolean; subscriptionPlan?: SubscriptionPlan; userData?: any } | undefined;
  SubscriptionPayment: { subscriptionPlan: SubscriptionPlan; userData: { name: string; email: string; phone: string; password: string } };
  Main: undefined;
  CustomPlateBuilder: undefined;
  Checkout: undefined;
  Orders: undefined;
  OrderDetail: { orderId: string };
  OrderTracking: { orderId: string };
  SatisfactionSurvey: { orderId: string };
  Employee: undefined;
  EmployeeLogin: undefined; // Add Employee Login to auth stack
  Producer: undefined; // Producer Panel
  ProducerLogin: undefined; // Producer Login
  Admin: undefined; // Admin Panel
  ThemeSettings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const { isAuthenticated, loading, user } = useAuthStore();
  const { initializeAdminAuth } = useAdminStore();

  // Initialize admin authentication on app start
  useEffect(() => {
    const initializeAuth = async () => {
      await initializeAdminAuth();
    };
    
    initializeAuth();
  }, [initializeAdminAuth]);

  if (loading) {
    // TODO: Add a proper loading screen
    return null;
  }

  // Check if user is producer
  const isProducer = isAuthenticated && user?.role === 'producer';

  console.log('📱 AppNavigator render:', { isAuthenticated, isProducer, userRole: user?.role });

  return (
    <NavigationContainer key={isAuthenticated ? 'authenticated' : 'guest'}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#22c55e',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {isProducer ? (
          // Producer Stack
          <Stack.Screen 
            name="Producer" 
            component={ProducerNavigator}
            options={{
              headerShown: false,
            }}
          />
        ) : isAuthenticated ? (
          // Authenticated Stack - Main App with Tabs
          <>
            <Stack.Screen 
              name="Main" 
              component={MainTabNavigator}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen 
              name="CustomPlateBuilder" 
              component={CustomPlateBuilderScreen}
              options={{
                title: 'Crear Platillo',
                headerStyle: {
                  backgroundColor: '#22c55e',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />
            <Stack.Screen 
              name="Checkout" 
              component={CheckoutScreen}
              options={{
                title: 'Checkout',
                headerStyle: {
                  backgroundColor: '#22c55e',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />
            <Stack.Screen 
              name="Orders" 
              component={OrdersScreen}
              options={{
                title: 'Mis Pedidos',
                headerStyle: {
                  backgroundColor: '#22c55e',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />
            <Stack.Screen 
              name="OrderDetail" 
              component={OrderDetailScreen}
              options={{
                title: 'Detalle del Pedido',
                headerStyle: {
                  backgroundColor: '#22c55e',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />
            <Stack.Screen 
              name="OrderTracking" 
              component={OrderTrackingScreen}
              options={{
                title: 'Seguimiento de Pedido',
                headerStyle: {
                  backgroundColor: '#22c55e',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />
            <Stack.Screen 
              name="SatisfactionSurvey" 
              component={SatisfactionSurveyScreen}
              options={{
                title: 'Encuesta de Satisfacción',
                headerStyle: {
                  backgroundColor: '#22c55e',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />
            <Stack.Screen 
              name="ThemeSettings" 
              component={ThemeSettingsScreen}
              options={{
                title: 'Temas',
                headerStyle: {
                  backgroundColor: '#0a0a0a',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />
          </>
        ) : (
          // Auth Stack
          <>
            <Stack.Screen 
              name="Login" 
              component={LoginScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen 
              name="Register" 
              component={RegisterScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen 
              name="SubscriptionPayment" 
              component={SubscriptionPaymentScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen 
              name="EmployeeLogin" 
              component={EmployeeLoginScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen 
              name="ProducerLogin" 
              component={ProducerLoginScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen 
              name="Employee" 
              component={EmployeeAppNavigator}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen 
              name="Producer" 
              component={ProducerNavigator}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen 
              name="Admin" 
              component={AdminNavigator}
              options={{
                headerShown: false,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};