import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useEmployeeStore } from '../stores/employeeStore';
import EmployeeLoginScreen from '../screens/employee/EmployeeLoginScreen';
import OrdersDashboardScreen from '../screens/employee/OrdersDashboardScreen';
import OrderDetailScreen from '../screens/employee/OrderDetailScreen';

export type EmployeeStackParamList = {
  EmployeeLogin: undefined;
  EmployeeDashboard: undefined;
  OrderDetail: {
    orderId: string;
  };
};

const Stack = createStackNavigator<EmployeeStackParamList>();

export const EmployeeAppNavigator: React.FC = () => {
  const { employee } = useEmployeeStore();
  const isEmployeeAuthenticated = !!employee;

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#ff6b35', // Kitchen orange theme
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      {isEmployeeAuthenticated ? (
        // Employee authenticated - show dashboard
        <>
          <Stack.Screen 
            name="EmployeeDashboard" 
            component={OrdersDashboardScreen}
            options={{
              title: '🧑‍🍳 Kitchen Dashboard',
              headerLeft: () => null, // Disable back button
              gestureEnabled: false, // Disable swipe back
            }}
          />
          
          <Stack.Screen 
            name="OrderDetail" 
            component={OrderDetailScreen}
            options={{
              title: '📋 Order Details',
            }}
          />
        </>
      ) : (
        // Employee not authenticated - show login
        <Stack.Screen 
          name="EmployeeLogin" 
          component={EmployeeLoginScreen}
          options={{
            title: 'Kitchen Login',
            headerShown: false, // Custom header in component
          }}
        />
      )}
    </Stack.Navigator>
  );
};